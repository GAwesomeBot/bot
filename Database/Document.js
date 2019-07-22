const Query = require("./Query");
const { Error: GABError } = require("../Internals/Errors");

const mpath = require("mpath");
const { ObjectID } = require("mongodb");

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
		// Cache enabled: this._doc = deepClone(doc);
		this._doc = doc;

		Object.assign(this, this._doc);
	}

	/**
	 * Pushes the pending changes of this document to MongoDB
	 * @returns {Promise<void>}
	 */
	async save () {
		const ops = this._atomics;
		this._atomics = {};
		let error;
		if (this._new) error = this.validate();
		if (error) throw error;
		if (!this._new && !Object.keys(ops).length) return;
		try {
			(this._new ? this._setCache : this._handleAtomics).call(this);
		} catch (err) {
			throw new GABError("GADRIVER_ERROR", {}, err);
		}
		Object.keys(ops).forEach(key => {
			if (Object.keys(ops[key]).length === 0) delete ops[key];
		});
		try {
			return await (this._new ? this._client.insertOne(this._doc, {}) : this._client.updateOne({ _id: this._id }, ops, { multi: true }));
		} catch (err) {
			throw new GABError("MONGODB_ERROR", {}, err);
		}
	}

	validate () {
		return this._model.schema.validateDoc(this);
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
		if (this._mergeAtomics(path, value, atomic)) return;
		if (atomic === "$push") {
			if (!this._atomics.$push[path]) this._atomics.$push[path] = { $each: [] };
			this._atomics.$push[path].$each.push(value);
		} else if (atomic === "$pull") {
			if (!this._atomics.$pull[path]) this._atomics.$pull[path] = { _id: { $in: [] } };
			this._atomics.$pull[path]._id.$in.push(value);
		} else if (atomic === "$pullAll") {
			if (!this._atomics[atomic][path]) this._atomics[atomic][path] = [];
			this._atomics[atomic][path].push(value);
		} else if (atomic === "$inc") {
			if (this._atomics[atomic][path]) this._atomics[atomic][path] += value;
			else this._atomics[atomic][path] = value;
		} else {
			this._atomics[atomic][path] = value;
		}
	}

	_mergeAtomics (newPath, newValue, newAtomic) {
		let atomicsMerged = false;
		const modifyAtomics = ["$set", "$inc", "$unset"];
		Object.keys(this._atomics).forEach(atomic => {
			if (atomicsMerged) return;
			const op = this._atomics[atomic];

			Object.keys(op).forEach(path => {
				if (atomicsMerged || (path.split(".").length === newPath.split(".").length && path !== newPath)) return;
				if (path === newPath) {
					switch (newAtomic) {
						case "$set":
						case "$unset":
							delete op[path];
							break;
						case "$pull":
						case "$pullAll":
							if (modifyAtomics.includes(atomic)) atomicsMerged = true;
							return;
						case "$inc":
							if (atomic === "$set") {
								op[path] += newValue;
								atomicsMerged = true;
							} else if (atomic !== "$inc") {
								atomicsMerged = true;
							}
							break;
						case "$push":
							if (atomic === "$set") atomicsMerged = true;
							break;
						default:
							return;
					}
				} else if (path.startsWith(newPath)) {
					switch (newAtomic) {
						case "$set":
						case "$inc":
						case "$unset":
							delete op[path];
							break;
						default:
							return;
					}
				} else if (newPath.startsWith(path)) {
					switch (atomic) {
						case "$unset":
						case "$pull":
						case "$pullAll":
							atomicsMerged = true;
							return;
						case "$set":
						case "$push":
							atomicsMerged = true;
							return;
					}
				}
			});
		});
		return atomicsMerged;
	}

	/**
	 * Handle this Document's registered Atomics to prepare them for save
	 * @private
	 */
	_handleAtomics () {
		if (this._atomics.$set) {
			Object.keys(this._atomics.$set).forEach(key => {
				const value = this._atomics.$set[key];
				this._modifyCache(key, value);
			});
		}

		if (this._atomics.$unset) {
			Object.keys(this._atomics.$unset).forEach(key => {
				const childPathSeparatorIndex = key.lastIndexOf(".");
				const parentPath = key.substring(0, childPathSeparatorIndex);
				const childPath = key.substring(childPathSeparatorIndex + 1);
				delete mpath.get(parentPath, this._cache)[childPath];
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

		if (this._atomics.$pull) {
			Object.keys(this._atomics.$pull).forEach(key => {
				const values = this._atomics.$pull[key]._id.$in;
				const array = mpath.get(key, this._cache);
				values.forEach(id => array.splice(array.findIndex(a => a._id === id), 1));
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
