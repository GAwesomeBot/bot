"use strict";
const Util = require("./../Util");

let g_erisMessage = null;

// represents eris/Message
class Message {
	// TODO:
	// 1. roleMentions should be Array(Role) instead? (Not how eris works tho)
	constructor(erisMessage) {
		g_erisMessage = erisMessage;
		this.attachments = erisMessage.attachements;
		this.channelMentions = erisMessage.channelMentions;
		this.cleanContent = erisMessage.cleanContent;
		this.content = erisMessage.content;
		this.editedTimestamp = erisMessage.editedTimestamp;
		this.embeds = erisMessage.embeds;
		this.id = erisMessage.id;
		this.mentionEveryone = erisMessage.mentionEveryone;
		this.pinned = erisMessage.pinned;
		this.roleMentions = erisMessage.roleMentions;
		this.timestamp = erisMessage.timestamp;
		this.tts = erisMessage.tts;

		this.mentions = () => {
			const Collection = require("./Collection");
			const User = require("./User");

			const mentions = new Collection(User);
			mentions.forEach(user => {
				this.mentions.add(new User(user));
			});
			return mentions;
		};

		this.delete = cb => {
			erisMessage.delete().then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.edit = (content, disableEveryone, cb) => {
			erisMessage.edit(content, disableEveryone).then(erisMessage => {
				if(Util.isFunction(cb)) {
					const Message = require("./Message");
					cb(new Message(erisMessage));
				}
			});
		};

		this.pin = cb => {
			erisMessage.pin().then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.unpin = cb => {
			erisMessage.unpin().then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};
	}

	get author() {
		const User = require("./User");
		return new User(g_erisMessage.author);
	}

	get channel() {
		const GuildChannel = require("./GuildChannel");
		return new GuildChannel(g_erisMessage.channel);
	}

	get guild() {
		const Guild = require("./Guild");
		return new Guild(g_erisMessage.guild);
	}

	get member() {
		const Member = require("./Member");
		return new Member(g_erisMessage.member);
	}
}

module.exports = Message;
