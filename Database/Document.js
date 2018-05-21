const Query = require("./Query");
const { Error: GABError } = require("../Internals/Errors");

module.exports = class Document {
	/**
	 * An object representing a Model document from MongoDB
	 * @param {object} doc The raw data received from MongoDB
	 * @param {Model} model The Model this document was created by
	 * @constructor
	 */
	constructor (doc, model) {
		/**
		 * A reference to the Model this document was created by
		 * @type {Model}
		 * @private
		 */
		this._model = model;
		/**
		 * !ignore
		 */
		this._client = this._model._client;
		/**
		 * An internal collection of all the atomics to be pushed to MongoDB on save
		 * @type {Object}
		 * @private
		 */
		this._atomics = {};
		/**
		 * The raw data received from MongoDB
		 * @type {Object}
		 * @private
		 */
		this._doc = doc;

		Object.assign(this, doc);
	}

	/**
	 * Pushes the pending changes of this document to MongoDB
	 * @returns {Promise<void>}
	 */
	save () {
		const atomics = this._atomics;
		this._atomics = {};
		try {
			return this._client.updateOne({ _id: this._id }, atomics, { multi: true });
		} catch (err) {
			throw new GABError("MONGODB_ERROR", err);
		}
	}

	/**
	 * Directly updates a set of mpath mapped changes
	 * @param {object} path A set of mpath mapped changes to push to MongoDB
	 * @returns {Promise}
	 */
	update (path) {
		return this._client.updateOne({ _id: this._id }, { $set: path }, { multi: true });
	}

	/**
	 * Returns the raw object according to schema
	 * @returns {object}
	 */
	toObject () {
		return this._doc;
	}

	toString () {
		return JSON.stringify(this.toObject());
	}

	/**
	 * A new query object tied to this Document
	 * @returns {Query}
	 * @readonly
	 */
	get query () {
		return new Query(this);
	}

	/**
	 * Register new atomic operations to be pushed to MongoDB on save
	 * @param {string} path
	 * @param {*} value
	 * @param {string} atomic
	 * @private
	 */
	_setAtomic (path, value, atomic) {
		if (!this._atomics) this._atomics = {};
		if (!this._atomics[atomic]) this._atomics[atomic] = {};
		if (atomic === "$push") {
			if (!this._atomics.$push[path]) this._atomics.$push[path] = { $each: [] };
			this._atomics.$push[path].$each.push(value);
		} else {
			this._atomics[atomic][path] = value;
		}
	}
};
