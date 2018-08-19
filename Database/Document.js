const Query = require("./Query");
const { Error: GABError } = require("../Internals/Errors");

const mpath = require("mpath");
const { ObjectID } = require("mongodb");

const isObject = obj => obj && obj.constructor === Object;

const deepClone = source => {
	if (typeof source !== "object" || source === null) return source;
	if (Array.isArray(source)) {
		const output = new Array(source.length);
		for (let i = 0, len = source.length; i < len; i++) output[i] = deepClone(source[i]);
		return output;
	}
	if (isObject(source)) {
		const output = {};
		for (const key in source) output[key] = deepClone(source[key]);
		return output;
	}
};

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
		 * Set to true for new Documents which do not exist in the database or cache.
		 * @type {boolean}
		 * @private
		 */
		this._new = false;
		/**
		 * !ignore
		 */
		this._client = this._model._client;
		/**
		 * An internal collection of all the atomic operations to be pushed to MongoDB on save
		 * @type {Object}
		 * @private
		 */
		this._atomics = {};
		/**
		 * The raw data received from MongoDB
		 * @type {Object}
		 * @private
		 */
		this._doc = deepClone(doc);

		Object.assign(this, this._doc);
	}

	/**
	 * Pushes the pending changes of this document to MongoDB
	 * @returns {Promise<void>}
	 */
	async save () {
		const ops = this._atomics;
		this._atomics = {};
		try {
			(this._new ? this._setCache : this._handleAtomics)();
		} catch (err) {
			throw new GABError("GADRIVER_ERROR", err);
		}
		try {
			return await this._client.updateOne({ _id: this._id }, ops, { multi: true });
		} catch (err) {
			throw new GABError("MONGODB_ERROR", err);
		}
	}

	validate () {
		return this._model._schema.validateDoc(this);
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

	toJSON () {
		return this._doc;
	}

	/**
	 * Cache this document in the Model's cache
	 * @param {boolean} update If an existing version of this document in the Model's cache should be overwritten when found
	 * @returns {boolean}
	 */
	cache (update) {
		return this._setCache(update);
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

	/**
	 * Handle this Document's registered Atomics to prepare them for save
	 * @private
	 */
	_handleAtomics () {
		// TODO: Handle atomics on save to update Model cache
		if (this._atomics.$set) {
			Object.keys(this._atomics.$set).forEach(key => {
				const value = this._atomics.$set[key];
				this._modifyCache(key, value);
			});
		}

		if (this._atomics.$inc) {
			Object.keys(this._atomics.$inc).forEach(key => {
				const value = mpath.get(key, this._cache);
				this._modifyCache(key, value + this._atomics.$inc[key]);
			});
		}

		if (this._atomics.$push) {
			Object.keys(this._atomics.$push).forEach(key => {
				const values = this._atomics.$push[key].$each;
				this._modifyCache(key, mpath.get(key, this._cache).concat(values));
			});
		}
	}

	/**
	 * Modify a value of the cached version of this document
	 * @param {string} path
	 * @param {*} val
	 * @private
	 */
	_modifyCache (path, val) {
		if (this._existsInCache && !this._new) mpath.set(path, val, this._cache);
	}

	/**
	 * Actually set a document in Model._cache, returning false if the document already exists in cache
	 * @param {boolean} force A boolean indicating if the existing document in cache should be ignored and overwritten
	 * @returns {boolean} A boolean indicating if the document was inserted or not
	 * @private
	 */
	_setCache (force) {
		if (!this._existsInCache || force) return !!this._model._cache.set(this._doc._id, this._doc);
		else return false;
	}

	/**
	 * A boolean indicating if a possibly outdated version of this document exists in the Model's cache
	 * @returns {boolean}
	 * @private
	 */
	get _existsInCache () {
		return this._model._cache.has(this._doc._id);
	}

	/**
	 * The cached version of this document
	 * @returns {Document | undefined}
	 * @private
	 */
	get _cache () {
		return this._model._cache.get(this._doc._id);
	}

	/**
	 * Create a new document which does not exist in the database or cache
	 * @param {object} obj The object containing the new document's data
	 * @param {Model} model The Model this Document is created by
	 * @returns {module.Document}
	 */
	static new (obj, model) {
		const doc = new Document(obj, model);
		doc._new = true;
		if (!doc._doc._id && model.schema._options._id !== false && !model.schema._definitions.get("_id")) doc._id = doc._doc._id = new ObjectID();
		return doc;
	}
};
