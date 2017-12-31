const TextBasedChannel = require("./Channels/TextBasedChannel");
const DMChannel = require("./DMChannel");
const Message = require("./Message");
let raw;

/**
 * Represents an extension user
 * @implements {TextBasedChannel}
 */
class User {
	constructor (rawUser) {
		/**
		 * The user avatar
		 * @type {?String}
		 */
		this.avatar = rawUser.avatar;
		/**
		 * Boolean that represents if a user is a bot or not
		 * @type {Boolean}
		 */
		this.bot = rawUser.bot;
		/**
		 * The user discriminator
		 * @type {String}
		 */
		this.discriminator = rawUser.discriminator;
		/**
		 * The user ID
		 * @type {Discord.Snowflake}
		 */
		this.id = rawUser.id;
		/**
		 * The users last message with the bot, if any
		 * @type {?Message}
		 */
		if (rawUser.lastMessage) this.lastMessage = new Message(rawUser.lastMessage);
		/**
		 * The users last message ID with the bot, if any
		 * @type {?Discord.Snowflake}
		 */
		if (rawUser.lastMessageID) this.lastMessageID = rawUser.lastMessageID;

		/**
		 * The users username
		 * @type {String}
		 */
		this.username = rawUser.username;
		raw = rawUser;
	}

	/**
	 * Data that can be resolved to a user. This can be:
	 * * An extension user
	 * * An ID
	 * @typedef {Discord.Snowflake|User} UserResolvable
	 */

	/**
	 * The time the user was created
	 * @type {Date}
	 * @readonly
	 */
	get createdAt () {
		return raw.createdAt;
	}

	/**
   * The timestamp the user was created at
   * @type {Number}
   * @readonly
   */
	get createdTimestamp () {
		return raw.createdTimestamp;
	}

	/**
	 * The presence of this user (you should use {@link GuildMember#presence} instead)
	 * @type {Discord.Presence}
	 * @readonly
	 */
	get presence () {
		return raw.presence;
	}

	/**
	 * Gets the user mention
	 * @returns {String} The user mention
	 */
	get mention () {
		return this.toString();
	}

	/**
	 * Also returns the mention
	 * @returns {String} The mention
	 */
	toString () {
		return `<@${this.id}>`;
	}

	/**
   * A link to the user's avatar.
   * @param {Object} [options={}] Options for the avatar url
   * @param {String} [options.format='webp'] One of `webp`, `png`, `jpg`, `gif`. If no format is provided,
   * it will be `gif` for animated avatars or otherwise `webp`
   * @param {Number} [options.size=128] One of `128`, `256`, `512`, `1024`, `2048`
   * @returns {?String}
   */
	avatarURL ({ format, size } = {}) {
		return raw.avatarURL({ format, size });
	}

	/**
   * A link to the user's default avatar
   * @type {String}
   * @readonly
   */
	get defaultAvatarURL () {
		return raw.defaultAvatarURL;
	}

	/**
   * A link to the user's avatar if they have one.
   * Otherwise a link to their default avatar will be returned.
   * @param {Object} [options={}] Options for the avatar url
   * @param {String} [options.format='webp'] One of `webp`, `png`, `jpg`, `gif`. If no format is provided,
   * it will be `gif` for animated avatars or otherwise `webp`
   * @param {Number} [options.size=128] One of `128`, '256', `512`, `1024`, `2048`
   * @returns {String}
   */
	displayAvatarURL ({ format, size } = {}) {
		return raw.displayAvatarURL({ format, size });
	}

	/**
   * The Discord "tag" for this user
   * @type {String}
   * @readonly
   */
	get tag () {
		return `${this.username}#${this.discriminator}`;
	}

	/**
   * The DM between the bot user and this user
   * @type {?DMChannel}
   * @readonly
   */
	get dmChannel () {
		let rawDM = raw.dmChannel;
		if (rawDM) return new DMChannel(rawDM);
		return null;
	}

	/**
	 * Creates a DM Channel between the user and the bot
	 * @returns {Promise<?DMChannel>} The new channel, or the existing one, if present
	 */
	async createDM () {
		let rawChannel;
		try {
			rawChannel = await raw.createDM();
		} catch (err) {
			throw err;
		}
		if (rawChannel) return new DMChannel(rawChannel);
		return null;
	}

	// These are here only for documentation purposes - they are implemented by TextBasedChannel
	/* eslint-disable no-empty-function */
	send () {}
}

TextBasedChannel.applyToClass(User);

module.exports = User;
