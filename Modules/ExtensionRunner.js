const domain = require("domain");
const fs = require("fs-nextra");

// Run an extension (command, keyword, or timer) in the sandbox
/* eslint-disable max-len, no-unused-vars*/
module.exports = async (bot, server, serverDocument, channel, extensionDocument, msg, suffix, keywordMatch) => {
	let extensionCode;
	try {
		extensionCode = await fs.readFile(`${__dirname}/../Extensions/${server.id}-${extensionDocument._id}.gabext`, "utf8");
	} catch (err) {
		winston.warn(`Failed to load the extension code for ${extensionDocument.type} extension "${extensionDocument.name}"`, { svrid: server.id, extid: extensionDocument._id }, err);
	}
	if (extensionCode) {
		const extensionDomain = domain.create();
		extensionDomain.run(() => {
			// Const extensionVM = new vm.Script(`(async () => {${extensionCode}})()`);
			// extensionVM.runInContext(extensionSandbox, {
			// 	displayErrors: true,
			// 	timeout: 10000,
			// });
		});
		extensionDomain.on("error", err => {
			winston.warn(`Failed to run ${extensionDocument.type} extension "${extensionDocument.name}": ${err.stack}`, { svrid: server.id, chid: channel.id, extid: extensionDocument._id });
		});
	}
};
