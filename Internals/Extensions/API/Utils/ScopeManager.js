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

		this.permissions = {
			messages: {
				readChannel: ["VIEW_CHANNEL", "READ_MESSAGE_HISTORY"],
				readGlobal: ["VIEW_CHANNEL", "READ_MESSAGE_HISTORY"],
				write: ["VIEW_CHANNEL", "SEND_MESSAGES"],
				manage: ["VIEW_CHANNEL", "MANAGE_MESSAGES"],
			},
			roles: {
				read: ["MANAGE_ROLES"],
				manage: ["MANAGE_ROLES"],
			},
			channels: {
				read: ["VIEW_CHANNEL"],
				manage: ["MANAGE_CHANNELS"],
			},
			guild: {
				read: ["MANAGE_GUILD"],
				manage: ["MANAGE_GUILD"],
				kick: ["KICK_MEMBERS"],
				ban: ["BAN_MEMBERS"],
			},
			members: {
				read: [],
				manage: ["MANAGE_NICKNAMES"],
			},
			accessDocument: [],
		};
	}

	/**
	 * Checks if the extension has sufficient scopes and the bot has permission to execute a function.
	 * @param {string} scope - The scope name that is checked
	 * @param {Discord.GuildChannel} [channel] - The channel to fetch the bot permissions from, null if none
	 * @param {string} [category] - The optional category that the scope name may be a part of
	 * @returns {boolean} True if the extension can successfully execute any functions that requires the given scope
	 */
	check (scope, category, channel) {
		let scopes = this.scopes;
		let permissions = this.permissions;
		if (category) {
			scopes = this.scopes[category];
			permissions = this.permissions[category];
		}
		if (!scopes[scope]) throw new GABError("MISSING_SCOPES");
		if (!channel) channel = this.guild.channels.first();
		if (!permissions.every(permission => channel.permissionsFor(this.guild.members.get(this.bot.user.id)).has(permission))) throw new GABError("MISSING_SCOPES");
		return true;
	}
};
