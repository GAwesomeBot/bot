const API = require("../index");
const { Constants: { Colors } } = require("../../../index");
let bot, server, serverDocument, scopes, scopeManager, extensionDocument;
const { ScopeManager } = API;

/**
 * Sandboxed Discord.js client
 */
module.exports = class Client {
	/**
	 * Create a Discord.js client sandboxed for extension execution
	 * @param {GABClient} rawBot The raw bot instance
	 * @param {Discord.Guild} rawServer The raw guild this client should be instantiated for
	 * @param {Document} rawServerDocument The server document for the guild
	 * @param {Object} rawExtensionDocument The extension's DB document
	 * @param {Object} rawScopes The scopes this extension has been granted by the guild
	 */
	constructor (rawBot, rawServer, rawServerDocument, rawExtensionDocument, rawScopes) {
		// Private values
		bot = rawBot;
		server = rawServer;
		serverDocument = rawServerDocument;
		scopes = rawScopes;
		extensionDocument = rawExtensionDocument;
		scopeManager = new ScopeManager(bot, server, scopes);

		// Extension values
		/**
		 * The client's Discord user.
		 * @type {API.User}
		 */
		this.user = new API.User(bot.user);

		/**
		 * The total amount of guilds that the bot is in.
		 * @type {Promise<number>}
		 */
		this.guilds = bot.guilds.totalCount;

		/**
		 * The total amount of users that the bot has cached.
		 * @type {Promise<number>}
		 */
		this.users = bot.users.totalCount;

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

	/**
	 * Checks if a given Member is muted in the given channel.
	 * Using this method requires the `channels_read` scope.
	 * @param {Discord.TextChannel} channel The channel to check
	 * @param {Discord.GuildMember} member The member to check
	 * @returns {Boolean} A boolean indicating if the given member is muted in the given channel
	 */
	isMuted (channel, member) {
		scopeManager.check("read", "channels", channel);
		return bot.isMuted(channel, member);
	}

	/**
	 * Mute a user using Channel permissions.
	 * Using this method requires the `channels_manage` scope.
	 * @param {Discord.TextChannel} channel The channel to mute the given member in
	 * @param {Discord.GuildMember} member The member to mute in the given channel
	 * @param {String} [reason] An optional reason to be displayed in the audit logs
	 * @returns {promise}
	 */
	muteMember (channel, member, reason) {
		scopeManager.check("manage", "channels", channel);
		return bot.muteMember(channel, member, reason);
	}

	/**
	 * Unmute a user using Channel permissions.
	 * Using this method requires the `channels_manage` scope.
	 * @param {Discord.TextChannel} channel The channel to unmute the given member in
	 * @param {Discord.GuildMember} member The member to mute in the given channel
	 * @param {String} [reason] An optional reason to be displayed in the audit logs
	 * @returns {promise}
	 */
	unmuteMember (channel, member, reason) {
		scopeManager.check("manage", "channels", channel);
		return bot.unmuteMember(channel, member, reason);
	}

	/**
	 * Find a member in the extension's guild
	 * @param {String} query The query to find the user with, an ID, a username, nickname, etc.
	 * @async
	 * @returns {API.Member}
	 */
	async findMember (query) {
		scopeManager.check("read", "members");
		return new API.Member(await bot.memberSearch(query, server));
	}

	/**
	 * Handles a member's violation with the specified action
	 * @param {String} channel The channel ID the violation occured
	 * @param {String} member The member ID that did the violation
	 * @param {String} userMessage A string that should be given to the user about the violation
	 * @param {String} adminMessage A string that should be given to the admins about what the user violated
	 * @param {String} strikeMessage The strike message that should appear in the mod logs and the audit logs
	 * @param {String} action What action should be taken.
	 * @param {String} roleID The role ID that the user should get due to the violation
	 * @async
	 * @returns {promise}
	 */
	async handleViolation (channel, member, userMessage, adminMessage, strikeMessage, action, roleID) {
		scopeManager.check("accessDocument");
		const ch = server.channels.get(channel);
		member = server.members.get(member);
		if (!member || !ch) {
			return;
		}
		if (!member.user.bot) {
			let userDocument = await Users.findOne(member.id);
			if (!userDocument) userDocument = await Users.new({ _id: member.id });
			let memberDocument = serverDocument.members[member.id];
			if (!memberDocument) {
				serverDocument.members.push({ _id: member.id });
				memberDocument = serverDocument.members[member.id];
			}
			return bot.handleViolation(server, serverDocument, ch, member, userDocument, memberDocument, userMessage, adminMessage, strikeMessage, action, roleID);
		}
	}

	/**
	 * Messages all Bot Admins (Level 2 and above) a given string
	 * @param {String} message The message to send in the form of a string
	 * @async
	 * @returns {promise}
	 */
	async messageBotAdmins (message) {
		scopeManager.check("accessDocument");
		if (typeof message !== "string") return;
		return bot.messageBotAdmins(server, serverDocument, {
			embed: {
				color: Colors.INFO,
				author: {
					name: extensionDocument.name,
				},
				description: message,
			},
		});
	}

	/**
	 * Listens for 60 seconds, awaiting a given user's message that passes an optional given filter
	 * @param {String} chid The channel to listen in
	 * @param {String} usrid The user to listen to
	 * @param {Function} [filter] The filter to apply to the user's messages
	 * @returns {Promise<Boolean|Discord.Message>} Returns false if no message was found within 60 seconds
	 */
	async awaitMessage (chid, usrid, filter) {
		const channel = server.channels.get(chid);
		if (!channel) {
			return false;
		}
		scopeManager.check("readGlobal", "messages", channel);

		if (!filter || typeof filter !== "function") filter = () => true;
		const response = (await channel.awaitMessages(res => (res.author.id === usrid) && filter(res), {
			max: 1,
			time: 60000,
		})).first();

		if (response) {
			return response;
		} else {
			return false;
		}
	}
};
