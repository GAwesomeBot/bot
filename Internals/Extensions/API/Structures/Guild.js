const API = require("../index");
const Collection = require("discord.js").Collection;
const ScopeManager = API.ScopeManager;
// eslint-disable-next-line no-unused-vars
let scopeManager, guild, serverDocument;

/**
 * Sandboxed Discord.js Guild
 */
module.exports = class Guild {
	/**
	 * @param {Discord.Guild} rawGuild The raw guild object from Discord.js
	 * @param {Object} scopes The scopes object
	 */
	constructor (rawGuild, scopes) {
		guild = rawGuild;
		serverDocument = rawGuild.serverDocument;
		scopeManager = new ScopeManager(scopes);

		this.afkChannelID = rawGuild.afkChannelID;
		this.afkTimeout = rawGuild.afkTimeout;
		this.createdAt = rawGuild.createdAt;
		this.createdTimestamp = rawGuild.createdTimestamp;
		this.embedEnabled = rawGuild.embedEnabled;

		const emojiStore = new Collection();
		rawGuild.emojis.forEach(emoji => {
			emojiStore.set(emoji.id, new API.Emoji(emoji, scopes));
		});
		this.emojis = emojiStore;
	}
};
