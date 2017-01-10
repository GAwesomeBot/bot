"use strict";
const Permission = require("./Permission");

// represents eris/PermissionOverwrite
module.exports = class PermissionOverwrite extends Permission {
	constructor(erisPermissionOverwrite) {
		super(erisPermissionOverwrite.allow, erisPermissionOverwrite.deny);
		this.id = erisPermissionOverwrite.id;
		this.type = erisPermissionOverwrite.type;
	}
};
