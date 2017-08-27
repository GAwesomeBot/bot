const { Collection } = require("discord.js");
const GuildMember = require("../Guilds/GuildMember");
const GuildChannel = require("../Channels/GuildChannel");
const VoiceChannel = require("../Channels/VoiceChannel");
const TextChannel = require("../Channels/TextChannel");
const User = require("../User");
const GuildRole = require("../Guilds/GuildRole");
let _content, _guild, _message;

class MessageMentions {
	constructor (message) {
		/**
     * Whether `@everyone` or `@here` were mentioned
     * @type {boolean}
     */
		this.everyone = Boolean(message.mentions.everyone);

		if (message.mentions.users) {
			this.users = new Collection();
			message.mentions.users.forEach(user => {
				this.users.set(user.id, new User(user));
			});
		}
		if (message.mentions.roles) {
			this.roles = new Collection();
			message.mentions.roles.forEach(role => {
				this.roles.set(role.id, new GuildRole(role));
			});
		}
		_message = message;
		_content = message.content;
		_guild = message.guild;
		/**
     * Cached members for {@MessageMention#members}
     * @type {?Collection<Snowflake, GuildMember>}
     * @private
     */
		this._members = null;

		/**
     * Cached channels for {@MessageMention#channels}
     * @type {?Collection<Snowflake, GuildChannel>}
     * @private
     */
		this._channels = null;
	}

	/**
   * Any members that were mentioned (only in {@link GuildChannel}s)
   * @type {?Collection<Snowflake, GuildMember>}
   * @readonly
   */
	get members () {
		if (this._members) return this._members;
		if (!_guild) return null;
		this._members = new Collection();
		_message.mentions.users.forEach(user => {
			const member = _guild.member(user);
			if (member) this._members.set(member.id, new GuildMember(member));
		});
		return this._members;
	}

	/**
   * Any channels that were mentioned
   * @type {Collection<Snowflake, GuildChannel>}
   * @readonly
   */
	get channels () {
		if (this._channels) return this._channels;
		this._channels = new Collection();
		let matches;
		while ((matches = this.constructor.CHANNELS_PATTERN.exec(_content)) !== null) {
			const channel = _guild.channels.get(matches[1]);
			if (channel) {
				switch (channel.type) {
					case "voice": {
						this._channels.set(channel.id, new VoiceChannel(channel));
						break;
					}
					case "text": {
						this._channels.set(channel.id, new TextChannel(channel));
						break;
					}
					default: {
						this._channels.set(channel.id, new GuildChannel(channel));
					}
				}
			}
		}
		return this._channels;
	}
}

/**
 * Regular expression that globally matches `@everyone` and `@here`
 * @type {RegExp}
 */
MessageMentions.EVERYONE_PATTERN = /@(everyone|here)/g;

/**
 * Regular expression that globally matches user mentions like `<@81440962496172032>`
 * @type {RegExp}
 */
MessageMentions.USERS_PATTERN = /<@!?[0-9]+>/g;

/**
 * Regular expression that globally matches role mentions like `<@&297577916114403338>`
 * @type {RegExp}
 */
MessageMentions.ROLES_PATTERN = /<@&[0-9]+>/g;

/**
 * Regular expression that globally matches channel mentions like `<#222079895583457280>`
 * @type {RegExp}
 */
MessageMentions.CHANNELS_PATTERN = /<#([0-9]+)>/g;

module.exports = MessageMentions;
