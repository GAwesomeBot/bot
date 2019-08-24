const fs = require("fs-nextra");
const { VM } = require("vm2");
const DJSClient = require("discord.js").Client;
const { AllowedEvents } = require("../Constants");
const DB = require("../../Database/Driver");
const Sandbox = require("./API/Sandbox");
const EventsHandler = require("./EventsHandler");

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
	 * @param {object} extensionConfigDocument
	 * @param {object} eventData
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
		if (!versionDocument.accepted) return { success: false, err: null };
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
		const extensionStatusQueryDocument = serverDocument.query.id("extensions", extensionConfigDocument._id).prop("status");
		if (result.success || !result.err) {
			extensionStatusQueryDocument.set("code", 0).set("description", null);
		} else {
			extensionStatusQueryDocument.set("code", 2);
			if (result.err instanceof Error && typeof result.err.message === "string") {
				extensionStatusQueryDocument.set("description", result.err.message);
			} else {
				extensionStatusQueryDocument.set("description", "Something went wrong!");
			}
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
		return fs.readFile(`${__dirname}/../../extensions/${versionDocument.code_id}.gabext`, "utf8");
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
			await vm.run(`(async () => {\n${code}\n})()`);
			return { success: true, err: null };
		} catch (err) {
			logger.debug(`Failed to run ${context.versionDocument.type} extension "${context.extensionDocument.name}"`,
				{ svrid: context.guild.id, extid: context.extensionDocument._id, v: context.versionDocument._id }, err);
			return { success: false, err };
		}
	}
}

module.exports = ExtensionManager;
