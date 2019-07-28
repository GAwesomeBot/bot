const { Scopes } = require("../../../Constants");
const ScopeManager = require("../Utils/ScopeManager");
const { wrapCollection, wrapArray, serializeError, parseSendMessageOptions } = require("../Utils/Utils");
const privProps = new WeakMap();

/**
 * Represents a message on Discord.
 * @memberof API
 */
class Message {
	constructor (API, client, msg, scopes, isRoot) {
		privProps.set(this, { API, client, msg, scopes, isRoot });

		/**
		 * A collection of attachments in this message.
		 * @type {Collection<API.Message>}
		 */
		this.attachments = wrapCollection(msg.attachments, API.Attachment, { API, client, scopes });
		/**
		 * The author of this message.
		 * @type {API.User}
		 */
		this.author = new API.User(msg.author);
		/**
		 * The channel this message was sent in.
		 * @member channel
		 * @type {API.Channel}
		 * @scope channels_read
		 */
		ScopeManager.setProtectedValue(this, "channel", new API.Channel(msg.channel), scopes, Scopes.channels_read.scope);
		/**
		 * This message's raw content.
		 * @type {String}
		 */
		this.content = msg.content;
		/**
		 * A UNIX Timestamp of the creation of this message.
		 * @type {Number}
		 */
		this.createdTimestamp = msg.createdTimestamp;
		/**
		 * A UNIX Timestamp of the latest edit of this message.
		 * @type {Number}
		 */
		this.editedTimestamp = msg.editedTimestamp;
		/**
		 * An array of embeds this message has.
		 * @type {Array<API.Embed>}
		 */
		this.embeds = Array.isArray(msg.embeds) ? wrapArray(msg.embeds, API.Embed, { API, client, scopes }) : [];
		/**
		 * The guild in which this message was sent.
		 * @type {API.Guild}
		 */
		this.guild = new API.Guild(msg.guild);
		/**
		 * The unique snowflake ID of this message.
		 * @type {String}
		 */
		this.id = msg.id;
		/**
		 * The author of this message their member object for this Guild.
		 * @type {?API.Member}
		 */
		this.member = new API.Member(msg.member);
		/**
		 * Whether or not this message is pinned.
		 * @type {Boolean}
		 */
		this.pinned = msg.pinned;
		/**
		 * Whether or not this message was sent by Discord.
		 * @type {Boolean}
		 */
		this.system = msg.system;
		/**
		 * Whether or not this message was a TTS message.
		 * @type {Boolean}
		 */
		this.tts = msg.tts;
		/**
		 * The type of this message.
		 * @type {String}
		 */
		this.type = msg.type;
		/**
		 * A URL to jump to this message in Discord.
		 * @type {String}
		 */
		this.url = msg.url;
		/**
		 * ID of the webhook that sent this message.
		 * @type {?String}
		 */
		this.webhookID = msg.webhookID;
	}

	/**
	 * The Date this message was created.
	 * @type {?Date}
	 * @readonly
	 */
	get createdAt () {
		return this.createdTimestamp ? new Date(this.createdTimestamp) : null;
	}

	/**
	 * Deletes this message.
	 * @param {String} reason - Reason for deleting this message, to be shown in Audit Logs.
	 * @returns {Promise<API.Message>}
	 * @scope messages_manage
	 */
	async delete (reason) {
		ScopeManager.check(privProps.get(this).scopes, Scopes.messages_manage.scope);
		await privProps.get(this).msg.delete({ reason }).catch(serializeError);
		return this;
	}

	/**
	 * Edits this message.
	 * @param {String|Object} content - The new content or embed for this message
	 * @param {Object} [embed] - The new embed for this message
	 * @returns {Promise<API.Message>}
	 * @scope messages_write
	 */
	async edit (content, embed) {
		ScopeManager.check(privProps.get(this).scopes, Scopes.messages_write.scope);
		const editOptions = parseSendMessageOptions(content, embed);
		await privProps.get(this).msg.edit(editOptions).catch(serializeError);
		return this;
	}

	/**
	 * Whether the extension can pin this message.
	 * @type {Boolean}
	 * @readonly
	 */
	get pinnable () {
		return !!(privProps.get(this).msg.pinnable && ScopeManager.check(privProps.get(this).scopes, Scopes.channels_manage.scope));
	}

	/**
	 * Pins this message.
	 * @returns {Promise<API.Message>}
	 * @scope channels_manage
	 */
	async pin () {
		ScopeManager.check(privProps.get(this).scopes, Scopes.channels_manage.scope);
		await privProps.get(this).msg.pin().catch(serializeError);
		return this;
	}

	/**
	 * Unpins this message.
	 * @returns {Promise<API.Message>}
	 * @scope channels_manage
	 */
	async unpin () {
		ScopeManager.check(privProps.get(this).scopes, Scopes.channels_manage.scope);
		await privProps.get(this).msg.unpin().catch(serializeError);
		return this;
	}

	/**
	 * Reply to this message by prefixing the author's mention to the specified message content.
	 * @param {String|Object} content - The content or embed for the reply
	 * @param {Object} [embed] - The embed for the reply
	 * @returns {Promise<API.Message>} The reply sent
	 */
	async reply (content, embed) {
		const props = privProps.get(this);
		props.isRoot || ScopeManager.check(props.scopes, Scopes.messages_send.scope);
		const replyOptions = parseSendMessageOptions(content, embed);
		const msg = await props.msg.reply(replyOptions).catch(serializeError);
		return new props.API.Message(props.API, props.client, msg, props.scopes);
	}
}

module.exports = Message;
