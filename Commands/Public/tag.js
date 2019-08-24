const defaultTags = require("../../Configurations/tags.json");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");
const Gist = require("../../Modules/Utils/GitHubGist");

class TagCommand {
	constructor ({ client, configJS, Constants: { Colors, Text, LoggingLevels } }, { serverDocument, serverQueryDocument }, msg, commandData) {
		// Command Data
		this.suffix = msg.suffix;
		this.channel = msg.channel;
		this.msg = msg;
		this.commandData = commandData;
		this.client = client;
		this.config = configJS;

		// User/Server Data
		this.serverDocument = serverDocument;
		this.serverQueryDocument = serverQueryDocument;
		this.isAdmin = this.client.getUserBotAdmin(msg.guild, serverDocument, msg.member) > 1 || configJSON.maintainers.includes(msg.author.id);

		// New Tag Data
		this.isCommand = false;
		this.isLocked = false;
		this.tag = "";
		this.value = "";

		// Constants
		this.Colors = Colors;
		this.Text = Text;
		this.LogLevels = LoggingLevels;
	}

	// List all tags
	async list () {
		if (!this.checkPerms("list")) {
			this.msg.send({
				embed: {
					color: this.Colors.MISSING_PERMS,
					description: `Only admins can list all tags. ✋`,
				},
			});
			return;
		}
		await this.client.api.channels(this.channel.id).typing.post();
		const gistUploader = new Gist(this.client);
		const info = this.serverDocument.config.tags.list.map(async tag => {
			const content = tag.content.replace(/(https?:[^ ]+)/gi, "<$1>");
			const useSpacing = tag.isLocked && tag.isCommand;
			let URL = null;
			if (content.length > 300) {
				const res = await gistUploader.upload({ text: `${content}`, title: `Tag Content for Tag "${tag._id}"` });
				if (res && res.url) {
					URL = res.rawURL;
				}
			}
			return [
				`» **${tag._id}**${!tag.isLocked && !tag.isCommand ? "" : ` (${tag.isLocked ? "🔒" : ""}${useSpacing ? "" : ""}${tag.isCommand ? "📄" : ""})`} «`,
				`\t${URL ? `This tag's content was too large. Please go [here](${URL}) to view it.` : `${content}`}`,
			].join("\n");
		});
		if (info.length) {
			for (let i = 0; i < info.length; i++) info[i] = await info[i];
			const chunks = info.chunk(10);
			const descriptions = [];
			for (const chunk of chunks) {
				descriptions.push(chunk.join("\n\n"));
			}
			const menu = new PaginatedEmbed(this.msg, {
				title: `${this.msg.guild}'s tags:`,
				color: this.Colors.RESPONSE,
			}, {
				descriptions,
			});
			await menu.init();
		} else {
			this.msg.send({
				embed: {
					color: this.Colors.SOFT_ERR,
					description: "This server doesn't have any tags yet! 📑",
				},
			});
		}
	}

	// Parse command suffix
	parse () {
		const params = this.suffix.trim().split("|").trimAll();
		if (params[0].trim() === "") params.splice(0, 1);

		if (params.length >= 1) {
			this.tag = params[0].toLowerCase();
		}

		if (params.length >= 2) {
			[, this.value] = params;
		}

		if (params.length >= 3) {
			const tagOpts = params[2].toLowerCase().split(/\s+/);
			if (tagOpts.includes("command")) {
				this.isCommand = true;
			}
			if (tagOpts.includes("lock")) {
				this.isLocked = true;
			}
		}

		return params.length !== 1 || ["clear", "defaults"].includes(params[0]);
	}

	// Execute tag command
	async execute () {
		switch (this.tag) {
			case "clear":
				await this.clear();
				break;
			case "defaults":
				await this.loadDefaults();
				break;
			default:
				if (this.value === "" || this.value === ".") {
					await this.deleteTag();
					return;
				}
				await this.update();
		}
	}

	// Show a tag
	async show (tag) {
		const data = this.get(tag);
		if (data.val) {
			this.msg.send({
				embed: {
					color: this.Colors.RESPONSE,
					description: data.val.content,
				},
			});
		} else {
			this.msg.send({
				embed: {
					color: this.Colors.SOFT_ERR,
					description: `Tag \`${this.suffix}\` does not exist.`,
					footer: {
						text: `Use "${this.msg.guild.commandPrefix}${this.commandData.name} ${this.suffix} | <content>" to create it.`,
					},
				},
			});
		}
	}

	// Delete all tags
	async clear () {
		if (!this.checkPerms("clear")) {
			return;
		}

		this.msg.send({
			embed: {
				color: this.Colors.PROMPT,
				description: "Are you sure you want to clear **all** tags?",
				footer: {
					text: "This will remove them forever! You have 1 minute to respond.",
				},
			},
		});
		const response = (await this.channel.awaitMessages(res => res.author.id === this.msg.author.id, { max: 1, time: 60000 })).first();
		if (response) {
			try {
				await response.delete();
			} catch (_) {
				// /shrug
			}
		}
		if (response && this.confirmAction(response)) {
			this.serverQueryDocument.set("config.tags.list", []);
			this.client.logMessage(this.serverDocument, this.LogLevels.INFO, "All tags have been cleared.", this.channel.id, this.msg.author.id);
			this.msg.send({
				embed: {
					color: this.Colors.SUCCESS,
					description: "All tags have been cleared 🗑",
				},
			});
		}
	}

	// Delete given tag
	deleteTag () {
		const data = this.get();
		if (!data.val) {
			return this.msg.send({
				embed: {
					color: this.Colors.SOFT_ERR,
					description: `Tag \`${this.tag}\` does not exist 😞`,
				},
			});
		}

		if (this.checkPerms(data.val.isCommand ? "deleteCommand" : "delete")) {
			data.remove();
			this.client.logMessage(this.serverDocument, this.LogLevels.INFO, `Tag ${this.tag} has been deleted.`, this.channel.id, this.msg.author.id);
			this.msg.send({
				embed: {
					color: this.Colors.SUCCESS,
					description: `Deleted tag \`${this.tag}\` (✖╭╮✖)`,
				},
			});
		} else {
			this.msg.send({
				embed: {
					color: this.Colors.MISSING_PERMS,
					description: `Only admins can delete \`${this.tag}\` ✋`,
				},
			});
		}
	}

	// Save tag data
	async update () {
		const data = this.get();
		if (!data.val) {
			if (this.checkPerms(this.isCommand ? "createCommand" : "create")) {
				this.serverQueryDocument.push("config.tags.list", {
					_id: this.tag,
					content: this.value,
					isCommand: this.isCommand,
					isLocked: this.isLocked,
				});
				this.client.logMessage(this.serverDocument, this.LogLevels.INFO, `New tag ${this.tag} has been created.`, this.channel.id, this.msg.author.id);
				this.msg.send({
					embed: {
						color: this.Colors.SUCCESS,
						description: `New ${this.isCommand ? "command " : ""}tag \`${this.tag}\` created 😃`,
					},
				});
			} else {
				this.msg.send({
					embed: {
						color: this.Colors.MISSING_PERMS,
						description: `Only admins can create new${this.isCommand ? " command " : " "}tags ✋`,
					},
				});
			}
		} else if (this.checkPerms("update")) {
			this.msg.send({
				embed: {
					color: this.Colors.PROMPT,
					description: `Tag \`${this.tag}\` already exists. Do you want to overwrite it?`,
					footer: {
						text: "You have 1 minute to respond.",
					},
				},
			});
			const response = (await this.channel.awaitMessages(res => res.author.id === this.msg.author.id, { max: 1, time: 60000 })).first();
			if (response) {
				try {
					await response.delete();
				} catch (_) {
					// /shrug
				}
			}
			if (response && this.confirmAction(response)) {
				data.set("content", this.value)
					.set("isCommand", this.isCommand)
					.set("isLocked", this.isLocked);
				this.client.logMessage(this.serverDocument, this.LogLevels.INFO, `Existing tag ${this.tag} has been updated.`, this.channel.id, this.msg.author.id);
				this.msg.send({
					embed: {
						color: this.Colors.SUCCESS,
						description: `Tag \`${this.tag}\` updated! ✏`,
					},
				});
			}
		} else {
			this.msg.send({
				embed: {
					color: this.Colors.MISSING_PERMS,
					description: `Only admins can update this tag. ✋`,
				},
			});
		}
	}

	// Get tag data
	get (tag) {
		tag = tag || this.tag;
		return this.serverQueryDocument.clone.id("config.tags.list", tag);
	}

	// Confirm a prompt response
	confirmAction (message) {
		return this.config.yesStrings.includes(message.content.trim().toLowerCase());
	}

	// Check the required perms (@everyone or Admin-only) for a subcommand
	checkPerms (subcmd) {
		switch (subcmd) {
			case "clear":
				return this.isAdmin;
			case "list":
				return this.isAdmin || !this.serverDocument.config.tags.listIsAdminOnly;
			case "delete":
				return this.isAdmin || (!this.serverDocument.config.tags.removingIsAdminOnly && !this.get().val.isLocked);
			case "deleteCommand":
				return this.isAdmin || (!this.serverDocument.config.tags.removingCommandIsAdminOnly && !this.get().val.isLocked);
			case "create":
				return this.isAdmin || !this.serverDocument.config.tags.addingIsAdminOnly;
			case "createCommand":
				return this.isAdmin || !this.serverDocument.config.tags.addingCommandIsAdminOnly;
			case "update":
				return this.isAdmin || !this.get().val.isLocked;
		}
	}

	// Load default tags
	loadDefaults () {
		this.serverQueryDocument.set("config.tags.list", defaultTags);
		this.msg.send({
			embed: {
				color: this.Colors.SUCCESS,
				description: "Loaded default tags! 📥",
			},
		});
	}
}

module.exports = async (main, documents, msg, commandData) => {
	const tagCommand = new TagCommand(main, documents, msg, commandData);
	if (!msg.suffix) {
		await tagCommand.list();
	} else if (tagCommand.parse()) {
		await tagCommand.execute();
	} else {
		await tagCommand.show();
	}
};
