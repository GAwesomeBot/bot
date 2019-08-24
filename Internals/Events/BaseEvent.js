const { Error } = require("../Errors/");

class BaseEvent {
	/**
	 * Base class for all events.
	 * @param {Client} client
	 * @param {Object} configJS
	 */
	constructor (client, configJS) {
		this.client = client;
		this.configJS = configJS;
		this.configJSON = configJSON;
	}

	/**
	 * Public handler for events
	 * @param {?Object} [values] The values that the event emitted
	 */
	async handle () {
		throw new Error("NO_HANDLE", {}, this.constructor.name);
	}

	/**
	 * Call this function to handle events if the requirement is set
	 * @param {?*[]} [args] Params to hand over to the requirement check, the prerequisite, and to the event
	 * @private
	 */
	async _handle (...args) {
		if (this.requirements(...args)) {
			await this.prerequisite(...args);
			return this.handle(...args);
		}
	}

	/**
	 * Simple logic for checking if the event should run or not.
	 * @param {?Object} [values] The values object that the event emitted
	 * @returns {Boolean}
	 */
	requirements () {
		return true;
	}

	/**
	 * Simple function that prepares everything that the event may need (like documents)
	 */
	async prerequisite () { } // eslint-disable-line no-empty-function
}

module.exports = BaseEvent;
