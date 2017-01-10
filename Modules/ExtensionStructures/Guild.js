"use strict";
const Util = require("./../Util");

let g_erisGuild = null;

// represents eris/Guild
module.exports = class Guild {
	// TODO:
	// 1. this.shard support?
	// 2. support GuildIntegration?
	constructor(erisGuild) {
		g_erisGuild = erisGuild;
		this.afkChannelID = erisGuild.afkChannelID;
		this.afkTimeout = erisGuild.afkTimeout;
		this.createdAt = erisGuild.createdAt;
		this.defaultNotifications = erisGuild.defaultNotifications;
		this.emojis = erisGuild.emojis;
		this.features = erisGuild.features;
		this.icon = erisGuild.icon;
		this.iconURL = erisGuild.iconURL;
		this.id = erisGuild.id;
		this.joinedAt = erisGuild.joinedAt;
		this.memberCount = erisGuild.memberCount;
		this.mfaLevel = erisGuild.mfaLevel;
		this.name = erisGuild.name;
		this.ownerID = erisGuild.ownerID;
		this.region = erisGuild.region;
		this.splash = erisGuild.splash;
		this.unavailable = erisGuild.unavailable;
		this.verificationLevel = erisGuild.verificationLevel;

		this.banMember = (userID, deleteMessageDays, cb) => {
			erisGuild.banMember(userID, deleteMessageDays).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.createChannel = (name, type, cb) => {
			erisGuild.createChannel(name, type).then(erisGuildChannel => {
				if(Util.isFunction(cb)) {
					const GuildChannel = require("./GuildChannel");
					cb(new GuildChannel(erisGuildChannel));
				}
			});
		};

		this.createEmoji = (options, cb) => {
			erisGuild.createEmoji(options).then(object => {
				if(Util.isFunction(cb)) {
					cb(object);
				}
			});
		};

		this.createRole = cb => {
			erisGuild.createRole().then(erisRole => {
				if(Util.isFunction(cb)) {
					const Role = require("./Role");
					cb(new Role(erisRole));
				}
			});
		};

		this.delete = cb => {
			erisGuild.delete().then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.deleteEmoji = (emojiID, cb) => {
			erisGuild.deleteEmoji(emojiID).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.deleteRole = (roleID, cb) => {
			erisGuild.deleteRole(roleID).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.edit = (options, cb) => {
			erisGuild.edit(options).then(erisGuild => {
				if(Util.isFunction(cb)) {
					const Guild = require("./Guild");
					cb(new Guild(erisGuild));
				}
			});
		};

		this.editEmoji = (emojiID, options, cb) => {
			erisGuild.editEmoji(emojiID, options).then(object => {
				if(Util.isFunction(cb)) {
					cb(object);
				}
			});
		};

		this.editMember = (userID, options, cb) => {
			erisGuild.editMember(userID, options).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.editNickname = (nick, cb) => {
			erisGuild.editNickname(nick).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.editRole = (roleID, options, cb) => {
			erisGuild.editRole(roleID, options).then(erisRole => {
				if(Util.isFunction(cb)) {
					const Role = require("./Role");
					cb(new Role(erisRole));
				}
			});
		};

		this.getBans = cb => {
			erisGuild.getBans().then(erisUsers => {
				if(Util.isFunction(cb)) {
					const User = require("./User");
					const Users = erisUsers.map(erisUser => new User(erisUser));
					cb(Users);
				}
			});
		};

		this.getChannels = cb => {
			erisGuild.getChannels().then(erisGuildChannels => {
				if(Util.isFunction(cb)) {
					const GuildChannel = require("./GuildChannel");
					const GuildChannels = erisGuildChannels.map(erisGuildChannel => new GuildChannel(erisGuildChannel));
					cb(GuildChannels);
				}
			});
		};

		this.getEmbed = cb => {
			erisGuild.getEmbed().then(object => {
				if(Util.isFunction(cb)) {
					cb(object);
				}
			});
		};

		this.getEmoji = (emojiID, cb) => {
			erisGuild.getEmoji(emojiID).then(object => {
				if(Util.isFunction(cb)) {
					cb(object);
				}
			});
		};

		this.getEmojis = cb => {
			erisGuild.getEmojis().then(objects => {
				if(Util.isFunction(cb)) {
					cb(objects);
				}
			});
		};

		this.getInvites = cb => {
			erisGuild.getInvites().then(erisInvites => {
				if(Util.isFunction(cb)) {
					const Invite = require("./Invite");
					const Invites = erisInvites.map(erisInvite => new Invite(erisInvite));
					cb(Invites);
				}
			});
		};

		this.getMember = (memberID, cb) => {
			erisGuild.getMember(memberID).then(erisMember => {
				if(Util.isFunction(cb)) {
					const Member = require("./Member");
					cb(new Member(erisMember));
				}
			});
		};

		this.getMembers = (limit, after, cb) => {
			erisGuild.getMembers(limit, after).then(erisMembers => {
				if(Util.isFunction(cb)) {
					const Member = require("./Member");
					const Members = erisMembers.map(erisMember => new Member(erisMember));
					cb(Members);
				}
			});
		};

		this.getPruneCount = (days, cb) => {
			erisGuild.getPruneCount(days).then(num => {
				if(Util.isFunction(cb)) {
					cb(num);
				}
			});
		};

		this.getRoles = cb => {
			erisGuild.getRoles().then(erisRoles => {
				if(Util.isFunction(cb)) {
					const Role = require("./Role");
					const Roles = erisRoles.map(erisRole => new Role(erisRole));
					cb(Roles);
				}
			});
		};

		this.getVoiceRegions = cb => {
			erisGuild.getVoiceRegions().then(objects => {
				if(Util.isFunction(cb)) {
					cb(objects);
				}
			});
		};

		this.getWebhooks = cb => {
			erisGuild.getWebhooks().then(objects => {
				if(Util.isFunction(cb)) {
					cb(objects);
				}
			});
		};

		this.kickMember = (userID, cb) => {
			erisGuild.kickMember(userID).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.leave = cb => {
			erisGuild.leave().then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.pruneMembers = (days, cb) => {
			erisGuild.pruneMembers(days).then(numPruned => {
				if(Util.isFunction(cb)) {
					cb(numPruned);
				}
			});
		};

		this.unbanMember = (userID, cb) => {
			erisGuild.unbanMember(userID).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};
	}

	get channels() {
		const Collection = require("./Collection");
		const GuildChannel = require("./GuildChannel");

		const channels = new Collection(GuildChannel);
		g_erisGuild.channels.forEach(erisGuildChannel => {
			channels.add(new GuildChannel(erisGuildChannel));
		});
		return channels;
	}

	get defaultChannel() {
		const GuildChannel = require("./GuildChannel");
		return new GuildChannel(g_erisGuild.defaultChannel);
	}

	get members() {
		const Collection = require("./Collection");
		const Member = require("./Member");

		const members = new Collection(Member);
		g_erisGuild.members.forEach(erisMember => {
			members.add(new Member(erisMember));
		});
		return members;
	}

	get roles() {
		const Collection = require("./Collection");
		const Role = require("./Role");

		const roles = new Collection(Role);
		g_erisGuild.roles.forEach(erisRole => {
			roles.add(new Role(erisRole));
		});
		return roles;
	}
};
