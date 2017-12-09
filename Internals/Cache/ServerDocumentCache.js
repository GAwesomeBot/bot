const BaseCache = require("./BaseCache");

module.exports = class ServerDocumentCache extends BaseCache {
	constructor (client) {
		super(client, Servers);
	}

	get (id) {
		let existing = super.get(id);
		if (existing) return existing;
		this.holds.findOne({ _id: id }).exec()
			.then(serverDocument => {
				super.set(serverDocument._id, serverDocument);
			})
			.catch(err => {
				winston.warn(`Failed to get server document for cache!`, { guild: id }, err);
			});
		return super.get(id);
	}

	async update (id) {
		try {
			let newDocument = await this.holds.findOne({ _id: id }).exec();
			if (newDocument) this._cache.set(id, newDocument);
		} catch (err) {
			winston.warn(`Failed to get new server document for cache update!`, { guild: id }, err);
		}
	}
};
