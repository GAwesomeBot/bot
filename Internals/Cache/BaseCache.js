const { Error } = require("../Errors/");

module.exports = class BaseCache {
	constructor (holds) {
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
