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

	*keys () {
		yield* this._cache.keys();
	}

	*values () {
		yield* this._cache.values();
	}

	*entries () {
		yield* this._cache.entries();
	}

	*[Symbol.iterator] () {
		yield* this.values();
	}
};
