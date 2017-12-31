const events = require("../../Configurations/events");
const reload = require("require-reload")(require);
const { Error } = require("../Errors/");

module.exports = class EventHandler {
	constructor (client, configJS) {
		this.client = client;
		this.configJS = configJS;
		this.configJSON = configJSON;
		this._cache = {};
	}

	async init () {
		for (let [eventName, eventFiles] of Object.entries(events)) {
			this._cache[eventName] = {};
			for (let eventFile of eventFiles) {
				let event = require(`./${eventName}/${eventFile}.js`);
				this._cache[eventName][eventFile] = new event(this.client, this.configJS, this.configJSON);
			}
		}
	}

	async reloadEvent (eventName) {
		if (eventName === "*") {
			for (const eventNameInCache in this._cache) {
				for (let eventFileName in this._cache[eventNameInCache]) {
					let event = reload(`./${eventNameInCache}/${eventFileName}.js`);
					this._cache[eventNameInCache][eventFileName] = new event(this.client, this.configJS, this.configJSON);
				}
			}
			return;
		}
		if (!this._cache[eventName]) throw new Error("UNKNOWN_EVENT", eventName);
		if (this._cache[eventName]) {
			for (let eventFileName in this._cache[eventName]) {
				let event = reload(`./${eventName}/${eventFileName}.js`);
				this._cache[eventName][eventFileName] = new event(this.client, this.configJS, this.configJSON);
			}
		}
	}

	/**
	 * Run all event file(s) once an event is triggered
	 * @param {string} eventName The event that was emitted
	 * @param {*[]} args The arguments of the event, in the order that they were received
	 */
	async onEvent (eventName, ...args) {
		if (!this._cache[eventName]) throw new Error("UNKNOWN_EVENT", eventName);
		if (this._cache[eventName]) {
			let promiseArray = [];
			for (let eventFile in this._cache[eventName]) {
				promiseArray.push(this._cache[eventName][eventFile]._handle(...args));
			}
			if (promiseArray.length) return Promise.all(promiseArray);
		}
	}
};
