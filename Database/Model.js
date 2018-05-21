const Document = require("./Document");

module.exports = class Model {
	/**
	 * A representation of a MongoDB collection
	 * @param {MongoClient} client The MongoDB client initialising the Model
	 * @param {string} collection Name of the collection this Model is representing
	 * @param {Schema} schema The schema of the collection this Model is representing
	 * @constructor
	 */
	constructor (client, collection, schema) {
		this._collection = collection;
		this._schema = schema;
		this._client = client.collection(this._collection);
	}

	/**
	 * Finds a document by ID or filter object, returns null if no documents were found
	 * @param {string|Object} query The ID of the object to find, or a filter object
	 * @returns {Promise<Document|null>}
	 */
	async findOne (query) {
		if (typeof query === "string") query = { _id: query };
		const raw = await this._client.findOne(query);
		if (raw) return new Document(raw, this);
		else return null;
	}

	async insert (data) {
		if (!data) return null;
		if (data.constructor === "array")
	}
};
