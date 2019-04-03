const Extendable = require("../ExtendableBase");

module.exports = class extends Extendable {
	constructor () {
		super(["DMChannel", "TextChannel"], "postable");
	}

	get extend () {
		return !this.guild || (this.readable && this.permissionsFor(this.guild.me).has("SEND_MESSAGES"));
	}
};
