const Extendable = require("../ExtendableBase");

module.exports = class extends Extendable {
	constructor () {
		super(["DMChannel", "TextChannel"], "readable");
	}

	get extend () {
		return !this.guild || this.permissionsFor(this.guild.me).has("VIEW_CHANNEL");
	}
};
