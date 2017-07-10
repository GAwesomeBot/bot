"use strict";
const Util = require("./../Util");

let g_erisInvite = null;

// represents eris/Invite
module.exports = class Invite {
	constructor(erisInvite) {
		g_erisInvite = erisInvite;
		this.channel = erisInvite.channel;
		this.code = erisInvite.code;
		this.createdAt = erisInvite.createdAt;
		this.guild = erisInvite.guild;
		this.maxAge = erisInvite.maxAge;
		this.maxUses = erisInvite.maxUses;
		this.revoked = erisInvite.revoked;
		this.temporary = erisInvite.temporary;
		this.uses = erisInvite.users;

		this.inviter = null;
		if(g_erisInvite.inviter) {
			const User = require("./User");
			this.inviter = new User(g_erisInvite.inviter);
		}

		this.delete = cb => {
			erisInvite.delete().then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};
	}
};
