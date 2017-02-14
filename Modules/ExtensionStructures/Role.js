"use strict";
const Util = require("./../Util");

let g_erisRole = null;

// represents eris/Role
module.exports = class Role {
	constructor(erisRole) {
		g_erisRole = erisRole;
		this.color = erisRole.color;
		this.createdAt = erisRole.createdAt;
		this.hoist = erisRole.hoist;
		this.id = erisRole.id;
		this.managed = erisRole.managed;
		this.mention = erisRole.mention;
		this.mentionable = erisRole.mentionable;
		this.name = erisRole.name;
		this.position = erisRole.position;

		const Permission = require("./Permission");
		this.permissions = new Permission(g_erisRole.permissions);

		this.delete = cb => {
			erisRole.delete().then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.edit = (options, cb) => {
			erisRole.edit(options).then(erisRole => {
				if(Util.isFunction(cb)) {
					const Role = require("./Role");
					cb(new Role(erisRole));
				}
			});
		};

		this.editPosition = (position, cb) => {
			erisRole.editPosition(position).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};
	}

	get guild() {
		const Guild = require("./Guild");
		return new Guild(g_erisRole.guild);
	}
};
