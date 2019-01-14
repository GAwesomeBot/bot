const fs = require("fs-nextra");
const { VM } = require("vm2");
const DJSClient = require("discord.js").Client;
const { AllowedEvents } = require("../Constants");
const DB = require("../../Database/Driver");
const API = require("./API");
const EventsHandler = require("./EventsHandler");
const { Sandbox } = API;

/**
 * Manages all operations of extensions on the Shard Worker.
 * @class
 */
class ExtensionManager extends DJSClient {
	constructor (options) {
		super(options);
		/**
		 * A boolean indicating if this Manager is ready to run extensions.
		 * @type {boolean}
		 */
		this.ready = false;
		/**
		 * The global Database object, if this ExtensionManager is connected to a MongoDB instance, otherwise null.
		 * @type {?Database}
		 */
		this.DB = null;
		/**
		 * Events handler initialized on the first call to ExtensionManager.initialize()
		 * @type {?EventsHandler}
		 */
		this.handler = null;
	}

	/**
	 * Initialize the Manager to run extensions and connect to MongoDB and Discord.
	 * @returns {Promise<void>}
	 */
	async initialize () {
		this._initializeEventsHandler();
		await DB.initialize(this.options.database);
		this.DB = global.Database;
		this.ready = true;
	}

	/**
	 * Construct and bind this manager's EventsHandler if it doesn't already have one.
	 * @returns {?EventsHandler} The EventsHandler bound to this manager after initializing
	 * @private
	 */
	_initializeEventsHandler () {
		if (!this.handler) this.handler = new EventsHandler(this, AllowedEvents);
		return this.handler;
	}

	/**
	 * Run an extension triggered by the provided eventData.
	 * @param {Document} extensionDocument
	 * @param {object} versionDocument
	 * @param {Document} serverDocument
	 * @param {object} eventData
	 * @param {object} extensionConfigDocument
	 * @param {GABGuild} eventData.guild
	 * @param {GABMessage} [eventData.msg]
	 * @param {object} [eventData.event]
	 * @returns {{ success: boolean, err: ?Error }}
	 */
	async runExtension (extensionDocument, versionDocument, serverDocument, extensionConfigDocument, eventData) {
		const context = { extensionDocument, versionDocument, serverDocument, extensionConfigDocument, client: this, guild: eventData.guild };
		switch (versionDocument.type) {
			case "command":
			case "keyword":
				context.msg = eventData.msg;
				break;
			case "event":
				context.event = eventData.event;
				break;
		}
		const result = await this.runWithContext(await this.fetchExtensionCode(versionDocument), context);
		await this.handleRunResult(result, serverDocument, extensionConfigDocument);
		return result;
	}

	/**
	 * Handle the result of an extension run and save serverDocument modifications.
	 * @param {{ success: boolean, err: ?Error }} result
	 * @param {Document} serverDocument
	 * @param {object} extensionConfigDocument
	 * @returns {Promise<{ code: number, description: string }>}
	 */
	async handleRunResult (result, serverDocument, extensionConfigDocument) {
		if (result.success || !result.err) return extensionConfigDocument.status;
		const extensionStatusQueryDocument = serverDocument.query.id("extensions", extensionConfigDocument._id).prop("status");
		extensionStatusQueryDocument.set("code", 2);
		if (result.err instanceof Error && typeof result.err.message === "string") {
			extensionStatusQueryDocument.set("description", result.err.message);
		} else {
			extensionStatusQueryDocument.set("description", "Something went wrong!");
		}

		await serverDocument.save();
		return extensionConfigDocument.status;
	}

	/**
	 * Fetches the code associated with a versionDocument from the FS.
	 * @param {Object} versionDocument
	 * @returns {Promise<string>}
	 */
	fetchExtensionCode (versionDocument) {
		return fs.readFile(`${__dirname}/../../Extensions/${versionDocument.code_id}.gabext`, "utf8");
	}

	/**
	 * Evaluate a string of javascript code in a {Sandbox} with the provided context.
	 * @param {string} code
	 * @param {object} context
	 * @param {ExtensionManager} context.client
	 * @param {Document} context.serverDocument
	 * @param {Document} context.extensionDocument
	 * @param {object} context.versionDocument
	 * @param {object} context.extensionConfigDocument
	 * @param {GABMessage} [context.msg]
	 * @param {GABGuild} context.guild
	 * @param {object} [context.event]
	 * @returns {{ success: boolean, err: ?Error }}
	 */
	async runWithContext (code, context) {
		try {
			const vm = new VM({
				timeout: context.versionDocument.timeout,
				sandbox: new Sandbox(this, context, context.versionDocument.scopes),
			});
			await vm.run(code);
			return { success: true, err: null };
		} catch (err) {
			winston.debug(`Failed to run ${context.versionDocument.type} extension "${context.extensionDocument.name}": ${err.stack}`,
				{ svrid: context.guild.id, extid: context.extensionDocument._id, v: context.versionDocument._id }, err);
			return { success: false, err };
		}
	}

	/**
	 * Checks if a message string contains a command tag, returning the command and suffix
	 * @param {string} message The message string
	 * @param {Document} serverDocument The database server document for the server assigned with the message
	 * @returns {?Object} Object containing the command and the suffix (if present)
	 */
	checkCommandTag (message, serverDocument) {
		message = message.trim();
		let cmdstr;
		let commandObject = {
			command: null,
			suffix: null,
		};
		if (!serverDocument) return commandObject;
		if (serverDocument.config.command_prefix === "@mention" && message.startsWith(this.user.toString())) {
			cmdstr = message.substring(this.user.toString().length + 1);
		} else if (serverDocument.config.command_prefix === "@mention" && message.startsWith(`<@!${this.user.id}>`)) {
			cmdstr = message.substring(`<@!${this.user.id}>`.length + 1);
		} else if (message.startsWith(serverDocument.config.command_prefix)) {
			cmdstr = message.substring(serverDocument.config.command_prefix.length);
		}
		if (cmdstr && !cmdstr.includes(" ")) {
			commandObject = {
				command: cmdstr.toLowerCase(),
				suffix: null,
			};
		} else if (cmdstr) {
			const command = cmdstr.split(/\s+/)[0].toLowerCase();
			const suffix = cmdstr.replace(/[\r\n\t]/g, match => {
				const escapes = {
					"\r": "{r}",
					"\n": "{n}",
					"\t": "{t}",
				};
				return escapes[match] || match;
			}).split(/\s+/)
				.splice(1)
				.join(" ")
				.format({ n: "\n", r: "\r", t: "\t" });
			commandObject = {
				command,
				suffix,
			};
		}
		return commandObject;
	}
}

module.exports = ExtensionManager;
