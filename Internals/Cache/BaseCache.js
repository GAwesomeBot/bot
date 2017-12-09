const { Error } = require("../Errors/");

module.exports = class BaseCache {
	constructor (client, holds) {
		Object.defineProperty(this, "client", { value: client });
		Object.defineProperty(this, "holds", { value: holds });
		this._cache = new Map();
	}

	get (id) {
		return this._cache.get(id);
	}

	set (id, value) {
		this._cache.set(id, value);
		return value;
	}

	async update () {
		throw new Error("NON_OVERWRITTEN", "update");
	}
};
