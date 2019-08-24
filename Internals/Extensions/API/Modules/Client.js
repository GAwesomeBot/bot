const API = require("../index");
const privProps = new WeakMap();


/**
 * Sandboxed Discord.js client
 */
module.exports = class Client {
	/**
	 * Create a Discord.js client sandboxed for extension execution
	 * @param {GABClient} bot The raw bot instance
	 * @param {Discord.Guild} server The raw guild this client should be instantiated for
	 * @param {Document} serverDocument The server document for the guild
	 * @param {Object} extensionDocument The extension's DB document
	 * @param {Object} scopes The scopes this extension has been granted by the guild
	 */
	constructor (bot, server, serverDocument, extensionDocument, scopes) {
		// Private values
		privProps.set(this, { bot, server, serverDocument, extensionDocument, scopes });

		// Extension values
		/**
		 * The client's Discord user.
		 * @type {API.User}
		 */
		this.user = new API.User(bot.user);

		/**
		 * The amount of ms that have passed since this shard entered the READY state.
		 * @type {number}
		 */
		this.uptime = bot.uptime;

		/**
		 * The ID for the current shard.
		 * @type {string}
		 */
		this.shard = bot.shardID;
	}
};
