const runExtension = require("./ExtensionRunner.js");

module.exports = (bot, db, winston, svr, serverDocument, extensionDocument) => {
	winston.info(`Running timer extension '${extensionDocument.name}' in server '${svr.name}'`, {svrid: svr.id, extid: extensionDocument._id});
	extensionDocument.enabled_channel_ids.forEach(chid => {
		const ch = svr.channels.get(chid);
		if(ch) {
			runExtension(bot, db, winston, svr, serverDocument, ch, extensionDocument);
		}
	});
	setTimeout(() => {
		module.exports(bot, db, winston, svr, serverDocument, extensionDocument);
	}, extensionDocument.interval);
};
