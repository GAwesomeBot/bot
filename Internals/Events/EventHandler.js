const events = require("../../Configurations/events");

module.exports = class EventHandler {
	constructor (client, db, configJS, configJSON) {
		this.client = client;
		this.db = db;
		this.configJS = configJS;
		this.configJSON = configJSON;
		this._cache = {};
	}

	async init () {
		for (let [eventName, eventFiles] of Object.entries(events)) {
			this._cache[eventName] = {};
			for (let eventFile of eventFiles) {
				let event = require(`./${eventName}/${eventFile}.js`);
				this._cache[eventName][eventFile] = new event(this.client, this.db, this.configJS, this.configJSON);
			}
		}
	}

	async reloadEvent (eventName) {

	}

	/**
	 * Run all event file(s) once an event is triggered
	 * @param {string} eventName The event that was emitted
	 * @param {*[]} args The arguments of the event, in the order that they were received
	 */
	async onEvent (eventName, ...args) {
		if (!this._cache[eventName]) throw new Error(`Unknown event was parsed!`);
		if (this._cache[eventName]) {
			let promiseArray = [];
			for (let eventFile in this._cache[eventName]) {
				promiseArray.push(this._cache[eventName][eventFile]._handle(...args));
			}
			await Promise.all(promiseArray);
		}
	}
};
