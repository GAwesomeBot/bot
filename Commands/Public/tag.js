const defaultTags = require("../../Configurations/tags.json");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");

class TagCommand {
	constructor ({ bot, configJS, Constants: { Colors, Text, LoggingLevels } }, { serverDocument }, msg, commandData) {
		// Command Data
		this.suffix = msg.suffix;
		this.channel = msg.channel;
		this.msg = msg;
		this.commandData = commandData;
		this.bot = bot;
		this.config = configJS;

		// User/Server Data
		this.serverDocument = serverDocument;
		this.isAdmin = this.bot.getUserBotAdmin(msg.guild, serverDocument, msg.member) > 1 || configJSON.maintainers.includes(msg.author.id);

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
			this.channel.send({
				embed: {
					color: this.Colors.MISSING_PERMS,
					description: `Only admins can list all tags. ✋`,
				},
			});
			return;
		}
		const info = this.serverDocument.config.tags.list.map(tag => {
			const content = tag.content.replace(/(https?:[^ ]+)/gi, "<$1>");
			const useSpacing = tag.isLocked && tag.isCommand;
			return `» **${tag._id}**${!tag.isLocked && !tag.isCommand ? "" : ` (${tag.isLocked ? "🔒" : ""}${useSpacing ? "" : ""}${tag.isCommand ? "📄" : ""})`} «\n\t${content}`;
		});
		if (info.length) {
			const chunks = info.chunk(10);
			const description = [];
			for (const chunk of chunks) {
				description.push(chunk.join("\n\n"));
			}
			const menu = new PaginatedEmbed(this.msg, description, {
				title: `${this.msg.guild}'s tags:`,
				color: this.Colors.RESPONSE,
				footer: `Page {current description} out of {total descriptions}`,
			});
			await menu.init();
		} else {
			this.channel.send({
				embed: {
					color: this.Colors.SOFT_ERR,
					description: "This server doesn't have any tags yet! 📑",
				},
			});
		}
	}

	// Parse command suffix
	parse () {
		const params = this.suffix.split("|");

		if (params.length >= 1) {
			this.tag = params[0].trim().toLowerCase();
		}

		if (params.length >= 2) {
			this.value = params[1].trim();
		}

		if (params.length >= 3) {
			const tagOpts = params[2].trim().toLowerCase().split(/\s*,\s*/);
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
		if (data) {
			this.channel.send({
				embed: {
					color: this.Colors.RESPONSE,
					description: data.content,
				},
			});
		} else {
			this.channel.send({
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

		await this.channel.send({
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
			this.serverDocument.config.tags.list = [];
			this.bot.logMessage(this.serverDocument, this.LogLevels.INFO, "All tags have been cleared.", this.channel.id, this.msg.author.id);
			this.msg.channel.send({
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
		if (!data) {
			return this.channel.send({
				embed: {
					color: this.Colors.SOFT_ERR,
					description: `Tag \`${this.tag}\` does not exist 😞`,
				},
			});
		}

		if (this.checkPerms(data.isCommand ? "deleteCommand" : "delete")) {
			data.remove();
			this.bot.logMessage(this.serverDocument, this.LogLevels.INFO, `Tag ${this.tag} has been deleted.`, this.channel.id, this.msg.author.id);
			this.channel.send({
				embed: {
					color: this.Colors.SUCCESS,
					description: `Deleted tag \`${this.tag}\` (✖╭╮✖)`,
				},
			});
		} else {
			this.channel.send({
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
		if (!data) {
			if (this.checkPerms(this.isCommand ? "createCommand" : "create")) {
				this.serverDocument.config.tags.list.push({
					_id: this.tag,
					content: this.value,
					isCommand: this.isCommand,
					isLocked: this.isLocked,
				});
				this.bot.logMessage(this.serverDocument, this.LogLevels.INFO, `New tag ${this.tag} has been created.`, this.channel.id, this.msg.author.id);
				this.channel.send({
					embed: {
						color: this.Colors.SUCCESS,
						description: `New ${this.isCommand ? "command " : ""}tag \`${this.tag}\` created 😃`,
					},
				});
			} else {
				this.channel.send({
					embed: {
						color: this.Colors.MISSING_PERMS,
						description: `Only admins can create new${this.isCommand ? " command " : " "}tags ✋`,
					},
				});
			}
		} else if (this.checkPerms("update")) {
			await this.channel.send({
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
				data.content = this.value;
				data.isCommand = this.isCommand;
				data.isLocked = this.isLocked;
				this.bot.logMessage(this.serverDocument, this.LogLevels.INFO, `Existing tag ${this.tag} has been updated.`, this.channel.id, this.msg.author.id);
				this.channel.send({
					embed: {
						color: this.Colors.SUCCESS,
						description: `Tag \`${this.tag}\` updated! ✏`,
					},
				});
			}
		} else {
			this.channel.send({
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
		return this.serverDocument.config.tags.list.id(tag);
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
				return this.isAdmin || (!this.serverDocument.config.tags.removingIsAdminOnly && !this.get().isLocked);
			case "deleteCommand":
				return this.isAdmin || (!this.serverDocument.config.tags.removingCommandIsAdminOnly && !this.get().isLocked);
			case "create":
				return this.isAdmin || !this.serverDocument.config.tags.addingIsAdminOnly;
			case "createCommand":
				return this.isAdmin || !this.serverDocument.config.tags.addingCommandIsAdminOnly;
			case "update":
				return this.isAdmin || !this.get().isLocked;
		}
	}

	// Load default tags
	loadDefaults () {
		this.serverDocument.config.tags.list = defaultTags;
		this.channel.send({
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
