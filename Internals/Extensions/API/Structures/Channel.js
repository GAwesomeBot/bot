const { Scopes } = require("../../../Constants");
const ScopeManager = require("../Utils/ScopeManager");
const privProps = new WeakMap();

/**
 * Represents a message on Discord.
 * @memberof API
 */
class Channel {
	constructor (API, client, channel, scopes) {
		privProps.set(this, { API, client, channel, scopes });

		/**
		 * A UNIX Timestamp of the creation of this channel.
		 * @type {Number}
		 */
		this.createdTimestamp = channel.createdTimestamp;
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
	 * Whether the extension can delete this channel.
	 * @type {Boolean}
	 * @readonly
	 */
	get deletable () {
		return !!(privProps.get(this).channel.deletable && ScopeManager.check(privProps.get(this).scopes, Scopes.channels_manage.scope));
	}
}

module.exports = Channel;
