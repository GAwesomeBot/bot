"use strict";
const Util = require("./../Util");

let g_erisMember = null;

// represents eris/Member
module.exports = class Member {
	constructor(erisMember) {
		g_erisMember = erisMember;
		this.game = erisMember.game;
		this.id = erisMember.id;
		this.joinedAt = erisMember.joinedAt;
		this.mention = erisMember.mention;
		this.nick = erisMember.nick;
		this.roles = erisMember.roles;
		this.status = erisMember.status;

		// user aliases
		this.avatar = erisMember.avatar;
		this.avatarURL = erisMember.avatarURL;
		this.bot = erisMember.bot;
		this.createdAt = erisMember.createdAt;
		this.defaultAvatar = erisMember.defaultAvatar;
		this.defaultAvatarURL = erisMember.defaultAvatarURL;
		this.discriminator = erisMember.discriminator;
		this.username = erisMember.username;

		// functions
		this.ban = (deleteMessageDays, cb) => {
			erisMember.ban(deleteMessageDays).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.edit = (options, cb) => {
			erisMember.edit(options).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.kick = cb => {
			erisMember.kick().then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.unban = cb => {
			erisMember.unban().then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};
	}

	get guild() {
		const Guild = require("./Guild");
		return new Guild(g_erisMember.guild);
	}

	get permission() {
		const Permission = require("./Permission");
		return new Permission(g_erisMember.permission);
	}

	get user() {
		const User = require("./User");
		return new User(g_erisMember.user);
	}

	get voiceState() {
		const VoiceState = require("./VoiceState");
		return new VoiceState(g_erisMember.voiceState);
	}
};
