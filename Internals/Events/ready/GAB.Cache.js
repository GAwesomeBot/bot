const BaseEvent = require("../BaseEvent");

class CacheHandler extends BaseEvent {
	async handle () {
		winston.debug(`Adding our server documents to the cache...`);
		const serverDocuments = await Servers.find({
			_id: {
				$in: Array.from(this.bot.guilds.keys()),
			},
		}).exec();
		if (serverDocuments) {
			winston.debug(`Caching ${serverDocuments.length} servers`);
			for (const serverDocument of serverDocuments) {
				winston.silly(`Added "${this.bot.guilds.get(serverDocument._id)}" to the cache`, { guild: serverDocument._id });
				this.bot.cache.set(serverDocument._id, serverDocument);
			}
		}
	}
}

module.exports = CacheHandler;
