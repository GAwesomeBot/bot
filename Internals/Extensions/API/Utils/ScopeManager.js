const {
	Errors: {
		Error: GABError,
	},
} = require("../../../index");

module.exports = class ScopeManager {
	constructor (bot, guild, scopes) {
		this.scopes = scopes;
		this.bot = bot;
		this.guild = guild;
	}

	/**
	 * Checks if the extension has sufficient scopes and the bot has permission to execute a function.
	 * @param {String} scope - The scope name that is checked
	 * @param {String} [category] - The optional category that the scope name may be a part of
	 * @returns {Boolean} True if the extension can successfully execute any functions that requires the given scope
	 */
	check (scope, category) {
		let { scopes } = this;
		if (category) {
			scopes = scopes[category];
		}
		if (!scopes[scope]) throw new GABError("MISSING_SCOPES");
		return true;
	}
};
