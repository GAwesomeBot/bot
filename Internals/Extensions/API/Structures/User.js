const API = require("../index");
const {
	Constants: { Colors },
} = require("../../../index");
let raw, extensionDocument;

/**
 * Represents an extension user
 */
class User {
	constructor (rawUser, rawExtensionDocument) {
		extensionDocument = rawExtensionDocument;
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
		if (rawUser.lastMessage) this.lastMessage = new API.Message(rawUser.lastMessage);
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
	 * Send a message to this user
	 * @param {String} message The message to send to the user
	 * @async
	 * @returns {Promise<Boolean>}
	 */
	async send (message) {
		if (typeof message !== "string") return false;
		await raw.send({
			embed: {
				color: Colors.INFO,
				author: {
					name: extensionDocument.name,
				},
				description: message,
			},
		});
		return true;
	}
}

module.exports = User;
