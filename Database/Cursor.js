const Document = require("./Document");

/**
 * A GADriver Cursor wrapper for the MongoDB Cursor
 * @class
 */
class Cursor {
	/**
	 * Create a new Cursor
	 * @param {Cursor} cursor
	 * @param {Model} model
	 */
	constructor (cursor, model) {
		this._model = model;
		this._client = this._model._client;
		this._cursor = cursor;
	}

	skip (val) {
		this._cursor.skip(val);
		return this;
	}

	limit (val) {
		this._cursor.limit(val);
		return this;
	}

	sort (val) {
		this._cursor.sort(val);
		return this;
	}

	async exec () {
		const rawArray = await this._cursor.toArray();

		return rawArray.map(obj => new Document(obj, this._model));
	}
}

module.exports = Cursor;
