const Document = require("./Document");
const { Error: GABError } = require("../Internals/Errors");

module.exports = class Model {
	/**
	 * A representation of a MongoDB collection
	 * @param {MongoClient} client The MongoDB client initialising the Model
	 * @param {string} collection Name of the collection this Model is representing
	 * @param {Schema} schema The schema of the collection this Model is representing
	 * @constructor
	 */
	constructor (client, collection, schema) {
		this.schema = schema;
		this._collection = collection;
		this._client = client.collection(this._collection);
		this._cache = new Map();
	}

	/**
	 * Finds a document by ID or filter object, returns null if no documents were found
	 * @param {string|Object} query The ID of the object to find, or a filter object
	 * @returns {Promise<Document|null>}
	 */
	async findOne (query) {
		if (typeof query === "string") query = { _id: query };

		const raw = this._findCache(query) || await this._find(query);
		if (!raw) return null;

		const doc = new Document(raw, this);
		doc.cache();
		return doc;
	}

	async insert (data, opts) {
		if (!data) throw new GABError("GADRIVER_INVALID_PARAMS");

		let func = "insertOne";
		if (data.constructor === Array) func = "insertMany";

		const raw = this.schema.build(data);

		try {
			await this._client[func](raw, opts);
		} catch (err) {
			throw new GABError("MONGODB_ERROR", err);
		}

		const doc = new Document(raw, this);
		doc.cache();
		return doc;
	}

	new (data) {
		return Document.new(this.schema.build(data), this);
	}

	_find (query, opts, multi) {
		return this._client[multi ? "find" : "findOne"](query, opts);
	}

	_findCache (query) {
		if (this._cache.has(query._id)) return this._cache.get(query._id);
		else return null;
	}
};
