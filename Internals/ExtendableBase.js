module.exports = class ExtendableBase {
	constructor (appliesTo, name) {
		this.appliesTo = appliesTo;
		this.name = name;

		this.target = require("discord.js");

		this.enabled = false;
	}

	extend () {
		// Overwrite in your class
	}

	enable () {
		this.enabled = true;
		for (const structure of this.appliesTo) Object.defineProperty(this.target[structure].prototype, this.name, Object.getOwnPropertyDescriptor(this.constructor.prototype, "extend"));
		return this;
	}

	disable () {
		this.enabled = false;
		for (const structure of this.appliesTo) delete this.target[structure].prototype[this.name];
		return this;
	}
};
