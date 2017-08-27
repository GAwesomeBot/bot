const { Collection } = require("discord.js");
const Embed = require("../Utils/Embed.js");
const MessageMentions = require("./MessageMentions.js");
const MessageReaction = require("./MessageReaction.js");
let message;

/**
 * Class representing a Discord.js Message
 */
class Message {
	constructor (rawMessage) {
		message = rawMessage;
		this.attachments = new Collection();
		rawMessage.attachments.forEach(attach => {
			this.attachments.set(attach.id, {
				filename: attach.filename,
				filesize: attach.filesize,
				height: attach.height,
				id: attach.id,
				message: new Message(attach.message),
				proxyURL: attach.proxyURL,
				url: attach.url,
				width: attach.width,
			});
		});
		this.cleanContent = rawMessage.cleanContent;
		this.content = rawMessage.content;
		this.createdAt = rawMessage.createdAt;
		this.createdTimestamp = rawMessage.createdTimestamp;
		this.deletable = rawMessage.deletable;
		this.editable = rawMessage.editable;
		if (rawMessage.editedAt) this.editedAt = rawMessage.editedAt;
		if (rawMessage.editedTimestamp) this.editedTimestamp = rawMessage.editedTimestamp;
		if (rawMessage.edits) {
			this.edits = [];
			rawMessage.edits.forEach(msg => this.edits.push(new Message(msg)));
		}
		this.embeds = rawMessage.embeds;
		this.id = rawMessage.id;
		this.mentions = new MessageMentions(rawMessage);
		this.pinnable = rawMessage.pinnable;
		this.pinned = rawMessage.pinned;
		this.reactions = new Collection();
		rawMessage.reactions.forEach(reaction => {
			const id = reaction.emoji.id ? `${reaction.emoji.name}:${reaction.emoji.id}` : reaction.emoji.name;
			this.reactions.set(id, new MessageReaction(rawMessage, reaction.emoji, reaction.count, reaction.me, reaction));
		});
		this.system = rawMessage.system;
		this.tts = rawMessage.tts;
		this.type = rawMessage.type;
		if (rawMessage.webhookID) this.webhookID = rawMessage.webhookID;
	}

	get author () {
		const User = require("../User.js");
		return new User(message.author);
	}

	get channel () {
		const TextChannel = require("../Channels/TextChannel.js");
		return new TextChannel(message.channel);
	}

	get guild () {
		const Guild = require("../Guilds/Guild.js");
		return new Guild(message.guild);
	}

	get member () {
		const GuildMember = require("../Guilds/GuildMember.js");
		return new GuildMember(message.member);
	}

	async clearReactions () {
		let newRawMessage;
		try {
			newRawMessage = await message.clearReactions();
		} catch (err) {
			throw err;
		}
		if (newRawMessage) return new Message(newRawMessage);
	}

	async delete (options) {
		let newRawMessage;
		try {
			newRawMessage = await message.delete(options);
		} catch (err) {
			throw err;
		}
		if (newRawMessage) return new Message(newRawMessage);
	}

	async edit (content, options) {
		if (!options && typeof content === "object") {
			options = content;
			content = "";
		} else if (!options) {
			options = {};
		}
		// TODO: Discord.js 12.0 delet this
		if (options.content && content === "") {
			content = options.content;
			delete options.content;
		}
		// Till here
		if (options instanceof Embed) options = { embed: options._apiTransform() };
		let rawUpdatedMessage;
		try {
			rawUpdatedMessage = await message.edit(content, options);
		} catch (err) {
			throw err;
		}
		if (rawUpdatedMessage) return new Message(rawUpdatedMessage);
	}

	// TODO fetchWebhook

	async pin () {
		let rawPinnedMessage;
		try {
			rawPinnedMessage = await message.pin();
		} catch (err) {
			throw err;
		}
		if (rawPinnedMessage) return new Message(rawPinnedMessage);
	}

	async react (emoji) {
		let rawMessageReaction;
		try {
			rawMessageReaction = await message.react(emoji);
		} catch (err) {
			throw err;
		}
		if (rawMessageReaction) return new MessageReaction(message, rawMessageReaction.emoji, rawMessageReaction.count, rawMessageReaction.me, rawMessageReaction);
	}

	async reply (content, options) {
		if (!options && typeof content === "object") {
			options = content;
			content = "";
		} else if (!options) {
			options = {};
		}
		// TODO: Discord.js 12.0 delet this
		if (options.content && content === "") {
			content = options.content;
			delete options.content;
		}
		// Till here
		if (options instanceof Embed) options = { embed: options._apiTransform() };
		let rawUpdatedMessage;
		try {
			rawUpdatedMessage = await message.reply(content, options);
		} catch (err) {
			throw err;
		}
		if (rawUpdatedMessage) {
			if (!Array.isArray(rawUpdatedMessage)) {
				return new Message(rawUpdatedMessage);
			} else {
				const array = [];
				rawUpdatedMessage.forEach(msg => array.push(new Message(msg)));
				return array;
			}
		}
	}

	toString () {
		return this.content;
	}

	async unpin () {
		let rawUnpinnedMessage;
		try {
			rawUnpinnedMessage = await message.unpin();
		} catch (err) {
			throw err;
		}
		if (rawUnpinnedMessage) return new Message(rawUnpinnedMessage);
	}
}

module.exports = Message;
