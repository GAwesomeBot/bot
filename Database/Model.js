const { ObjectID } = require("mongodb");
const Document = require("./Document");
const Cursor = require("./Cursor");
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

	find (query, opts) {
		const rawCursor = this._find(query, opts, true);

		return new Cursor(rawCursor, this);
	}

	aggregate (pipeline, opts) {
		return this._client.aggregate(pipeline, opts).toArray();
	}

	count (query, opts) {
		return this._client.countDocuments(query, opts);
	}

	/**
	 * Finds a document by ID or filter object, returns null if no documents were found
	 * @param {string|Object} query The ID of the object to find, or a filter object
	 * @returns {Promise<Document|null>}
	 */
	async findOne (query) {
		if (typeof query === "string") query = { _id: query };

		// Cache enabled: const raw = this._findCache(query) || await this._find(query);
		const raw = await this._find(query);
		if (!raw) return null;

		const doc = new Document(raw, this);
		doc.cache();
		return doc;
	}

	async findOneByObjectID (id) {
		if (typeof id === "string") {
			try {
				id = new ObjectID(id);
			} catch (err) {
				return null;
			}
		}
		if (!id || !(id instanceof ObjectID)) return null;

		return this.findOne(id);
	}

	async update (query, operations, opts = {}) {
		try {
			return await this._client[opts.multi ? "updateMany" : "updateOne"](query, operations, opts);
		} catch (err) {
			throw new GABError("MONGODB_ERROR", {}, err);
		}
	}

	async insert (data, opts) {
		if (!data) throw new GABError("GADRIVER_INVALID_PARAMS");

		let func = "insertOne";
		if (Array.isArray(data)) {
			func = "insertMany";
			data = data.map(doc => {
				if (doc.constructor === Document) return doc.toObject();
				else return doc;
			});
		}

		try {
			return await this._client[func](data, opts);
		} catch (err) {
			throw new GABError("MONGODB_ERROR", {}, err);
		}
	}

	delete (query, options) {
		try {
			return this._client.deleteMany(query, options);
		} catch (err) {
			throw new GABError("MONGODB_ERROR", {}, err);
		}
	}

	new (data) {
		return Document.new(this.schema.build(data), this);
	}

	async create (data) {
		const document = this.new(data);
		await this._client.insertOne(document.toObject());
		document._new = false;
		return document;
	}

	_find (query, opts, multi) {
		return this._client[multi ? "find" : "findOne"](query, opts);
	}

	_findCache (query) {
		if (this._cache.has(query._id)) return this._cache.get(query._id);
		else return null;
	}
};
