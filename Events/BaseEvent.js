class BaseEvent {
	/**
	 * Base class for all events.
	 * @param {Client} bot 
	 * @param {DatabaseConnection} db 
	 * @param {Object} configJS 
	 * @param {Object} configJSON 
	 */
	constructor (bot, db, configJS, configJSON) {
		this.bot = bot;
		this.db = db;
		this.configJS = configJS;
		this.configJSON = configJSON;
	}

	/**
	 * Public handler for events
	 * @param {*} args The args that the event emitted
	 */
	async handle () {
		throw new Error(`${this.constructor.name} doesn't have a handle method!`);
	}

	/**
	 * Call this function to handle events if the requirement is set
	 * @param {*} args Params to hand over to the requirement check, and to the event
	 * @private
	 */
	async _handle (values = {}) {
		if (this.requirements(values)) {
			return this.handle(values);
		}
	}

	/**
	 * Simple logic for checking if the event should run or not.
	 * @param {*} args The args object that the event emitted
	 * @returns {Boolean}
	 */
	requirements () {
		return true;
	}
}

module.exports = BaseEvent;
