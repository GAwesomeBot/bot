const User = require("../Structures/User");
let bot;

module.exports = class ExtensionUserStore {
	constructor (rawBot) {
		this.size = rawBot.users.size;
		bot = rawBot;
	}

	/**
	 * Fetches information about a user
	 * @param {UserResolvable} user The user or user ID
	 * @returns {Promise<?User>} The fetched user
	 */
	async fetch (user) {
		let rawUser;
		user = user.id ? user.id : user;
		try {
			rawUser = await bot.users.fetch(user, false);
		} catch (err) {
			throw err;
		}
		if (rawUser) return new User(rawUser);
		else return null;
	}
};
