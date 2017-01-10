"use strict";

// represents eris/Permission
module.exports = class Permission {
	constructor(erisPermission) {
		this.allow = erisPermission.allow;
		this.deny = erisPermission.deny;
		this.json = erisPermission.json;
		this.has = erisPermission.has;
	}
};
