const { Collection } = require("discord.js");
const Message = require("./Message.js");
const ReactionEmoji = require("./ReactionEmoji.js");
const Emoji = require("./Emoji.js");
const User = require("./User.js");
let _client, _rawReaction;

class MessageReaction {
	constructor (message, emoji, count, me, rawReaction) {
		/**
     * The message that this reaction refers to
     * @type {Message}
     */
		this.message = new Message(message);

		/**
     * Whether the client has given this reaction
     * @type {boolean}
     */
		this.me = Boolean(me);

		/**
     * The number of people that have given the same reaction
     * @type {number}
     */
		this.count = count || 0;

		/**
     * The users that have given this reaction, mapped by their ID
     * @type {Collection<Snowflake, User>}
     */
		this.users = new Collection();

		this._emoji = new ReactionEmoji(this, emoji.name, emoji.id);
		_rawReaction = rawReaction;
		_client = message.client;
	}

	/**
   * The emoji of this reaction, either an Emoji object for known custom emojis, or a ReactionEmoji
   * object which has fewer properties. Whatever the prototype of the emoji, it will still have
   * `name`, `id`, `identifier` and `toString()`
   * @type {Emoji|ReactionEmoji}
   * @readonly
   */
	get emoji () {
		if (this._emoji instanceof Emoji) return this._emoji;
		// Check to see if the emoji has become known to the client
		if (this._emoji.id) {
			const emojis = _client.emojis;
			if (emojis.has(this._emoji.id)) {
				const emoji = emojis.get(this._emoji.id);
				this._emoji = new Emoji(emoji);
				return this._emoji;
			}
		}
		return this._emoji;
	}

	/**
   * Removes a user from this reaction.
   * @param {Snowflake|User} [user=this.message.client.user] The user to remove the reaction of
   * @returns {Promise<MessageReaction>}
   */
	remove (user = _client.user) {
		_rawReaction.remove(user.id ? user.id : user).then(newRawMessageReaction => Promise.resolve(new MessageReaction(newRawMessageReaction))).catch(err => Promise.reject(err));
	}

	/**
   * Fetch all the users that gave this reaction. Resolves with a collection of users, mapped by their IDs.
   * @param {number} [limit=100] The maximum amount of users to fetch, defaults to 100
   * @returns {Promise<Collection<Snowflake, User>>}
   */
	async fetchUsers (limit = 100) {
		const rawUsers = await _rawReaction.fetchUsers(limit);
		const users = new Collection();
		rawUsers.forEach(user => {
			users.set(user.id, new User(user));
		});
		return users;
	}
}

module.exports = MessageReaction;
