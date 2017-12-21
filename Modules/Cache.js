module.exports = async client => {
	winston.debug(`Adding our server documents to the cache...`);
	const serverDocuments = await Servers.find({
		_id: {
			$in: Array.from(client.guilds.keys()),
		},
	}).exec();
	if (serverDocuments.length) {
		winston.debug(`Caching ${serverDocuments.length} servers`);
		for (const serverDocument of serverDocuments) {
			winston.silly(`Added "${client.guilds.get(serverDocument._id)}" to the cache`, { guild: serverDocument._id, v: serverDocument.__v });
			client.cache.set(serverDocument._id, serverDocument);
		}
	}
};
