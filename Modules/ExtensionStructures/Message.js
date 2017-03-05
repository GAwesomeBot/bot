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
		this.reactions = erisMessage.reactions;

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

		this.addReaction = (reaction, cb) => {
			erisMessage.addReaction(reaction).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.removeReaction = (reaction, userID, cb) => {
			erisMessage.removeReaction(reaction, userID).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.getReaction = (reaction, limit, cb) => {
			erisMessage.getReaction(reaction, limit).then((users) => {
				if(Util.isFunction(cb)) {
					cb(users);
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
		return new Guild(g_erisMessage.channel.guild);
	}

	get member() {
		const Member = require("./Member");
		return new Member(g_erisMessage.member);
	}

	get mentions() {
		// Ignoring erisMessage.mentions as it needs resorting and there is no need to use it.
		// It also returns only User objects, but for extensions we want to pass back Member objects.
		const Guild = require("./Guild");
		const Collection = require("./Collection");
		const SrvMembers = new Guild(g_erisMessage.channel.guild).members;
		const content = (g_erisMessage.content.match(/<@!?[0-9]+>/g) || []).map(function(uid){return uid.replace(/[^0-9.]/g, '')});
		const mentions = [];
		for(var i=0; i<content.length; i++) {
			const member = SrvMembers.get(content[i]);
			if(member) mentions.push(member);
		}
		return mentions;
	}

}

module.exports = Message;
