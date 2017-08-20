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
	 * Runs the event if requirement is true.
	 */
	handle () {
		if (this.requirement()) {
			return true;
		} else {
			return false;
		}
	}
	/**
	 * Getter if the requirement passes.
	 * Can take any amount of params required.
	 */
	requirement () {
		return true;
	}
}

module.exports = BaseEvent;
