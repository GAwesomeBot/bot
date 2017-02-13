"use strict";
const Channel = require("./Channel");
const Permission = require("./Permission");
const Util = require("./../Util");

let g_erisGuildChannel = null;

// represents eris/GuildChannel
module.exports = class GuildChannel extends Channel {
	constructor(erisGuildChannel) {
		g_erisGuildChannel = erisGuildChannel;
		super(erisGuildChannel);
		this.bitrate = erisGuildChannel.bitrate;
		this.lastMessageID = erisGuildChannel.lastMessageID;
		this.lastPinTimestamp = erisGuildChannel.lastPinTimestamp;
		this.mention = erisGuildChannel.mention;
		this.name = erisGuildChannel.name;
		this.position = erisGuildChannel.position;
		this.topic = erisGuildChannel.topic;

		this.createInvite = (options, cb) => {
			erisGuildChannel.createInvite(options).then(erisInvite => {
				if(Util.isFunction(cb)) {
					const Invite = require("./Invite");
					cb(new Invite(erisInvite));
				}
			});
		};

		this.createWebhook = (options, cb) => {
			erisGuildChannel.createWebhook(options).then(object => {
				if(Util.isFunction(cb)) {
					cb(object);
				}
			});
		};

		this.delete = cb => {
			erisGuildChannel.delete().then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.deletePermission = (overwriteID, cb) => {
			erisGuildChannel.deletePermission(overwriteID).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.edit = (options, cb) => {
			erisGuildChannel.edit(options).then(_erisGuildChannel => {
				if(Util.isFunction(cb)) {
					const GuildChannel = require("./GuildChannel");
					cb(new GuildChannel(_erisGuildChannel));
				}
			});
		};

		this.editPermission = (overwriteID, allow, deny, type, cb) => {
			erisGuildChannel.editPermission(overwriteID, allow, deny, type).then(erisPermissionOverwrite => {
				if(Util.isFunction(cb)) {
					const PermissionOverwrite = require("./PermissionOverwrite");
					cb(new PermissionOverwrite(erisPermissionOverwrite));
				}
			});
		};

		this.editPosition = (position, cb) => {
			erisGuildChannel.editPosition(position).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.getInvites = cb => {
			erisGuildChannel.getInvites().then(erisInvites => {
				if(Util.isFunction(cb)) {
					const Invite = require("./Invite");
					const invites = erisInvites.map(erisInvite => new Invite(erisInvite));
					cb(invites);
				}
			});
		};

		this.getWebhooks = cb => {
			erisGuildChannel.getWebhooks().then(objects => {
				if(Util.isFunction(cb)) {
					cb(objects);
				}
			});
		};

		this.permissionsOf = memberID => {
			return new Permission(erisGuildChannel.permissionsOf(memberID));
		};

		this.addMessageReaction = (messageID, reaction, cb) => {
			erisGuildChannel.addMessageReaction(messageID, reaction).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.removeMessageReaction = (messageID, reaction, userID, cb) => {
			erisGuildChannel.removeMessageReaction(messageID, reaction, userID).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.getMessageReaction = (messageID, reaction, limit, cb) => {
			erisGuildChannel.getMessageReaction(messageID, reaction, limit).then((users) => {
				if(Util.isFunction(cb)) {
					cb(users);
				}
			});
		};
	}

	get guild() {
		const Guild = require("./Guild");
		return new Guild(g_erisGuildChannel.guild);
	}

	get messages() {
		const Collection = require("./Collection");
		const Message = require("./Message");

		const messages = new Collection(Message);
		g_erisGuildChannel.messages.forEach(erisMessage => {
			messages.add(new Message(erisMessage));
		});
		return messages;
	}

	get permissionOverwrites() {
		const Collection = require("./Collection");
		const PermissionOverwrite = require("./PermissionOverwrite");

		const permissionOverwrites = new Collection(PermissionOverwrite);
		g_erisGuildChannel.permissionOverwrites.forEach(erisPermissionOverwrite => {
			permissionOverwrites.add(new PermissionOverwrite(erisPermissionOverwrite));
		});
		return permissionOverwrites;
	}

	get voiceMembers() {
		let voiceMembers = null;
		if(g_erisGuildChannel.voiceMembers) {
			const Collection = require("./Collection");
			const Member = require("./Member");

			voiceMembers = new Collection(Member);
			g_erisGuildChannel.members.forEach(erisVoiceMember => {
				voiceMembers.add(new Member(erisVoiceMember));
			});
		}
		return voiceMembers;
	}
};
