class MongooseCache {
	constructor (client) {
		this.client = client;
		this._cache = new Map();
	}

	get (id) {
		if (this._cache.get(id)) return this._cache.get(id);
		// Forgive me for this
		Servers.findOne({ _id: id }).exec()
			.then(serverDocument => {
				this._cache.set(id, serverDocument);
			})
			.catch(err => {
				winston.warn(`Failed to get server document for cache!`, { guild: id }, err);
			});
		return this._cache.get(id) || null;
	}

	set (id, document) {
		this._cache.set(id, document);
		return document;
	}

	async update (id) {
		try {
			let newDocument = await Servers.findOne({ _id: id }).exec();
			if (newDocument) this._cache.set(id, newDocument);
		} catch (err) {
			winston.warn(`Failed to get new server document for cache update!`, { guild: id }, err);
		}
	}
}

module.exports = MongooseCache;
