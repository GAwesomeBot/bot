const { VM } = require("vm2");
const fs = require("fs-nextra");

// Run an extension (command or keyword) in the sandbox
/* eslint-disable max-len, no-unused-vars*/
module.exports = async (bot, server, serverDocument, channel, extensionDocument, msg, suffix, keywordMatch) => {
	let extensionCode;
	try {
		extensionCode = await fs.readFile(`${__dirname}/../extensions/${extensionDocument.code_id}.gabext`, "utf8");
	} catch (err) {
		logger.warn(`Failed to load the extension code for ${extensionDocument.type} extension "${extensionDocument.name}"`, { svrid: server.id, extid: extensionDocument._id }, err);
	}
	if (extensionCode) {
		try {
			const vm = new VM({
				timeout: extensionDocument.timeout,
				sandbox: {},
			});
			vm.run(extensionCode);
		} catch (err) {
			logger.warn(`Failed to run ${extensionDocument.type} extension "${extensionDocument.name}"`, { svrid: server.id, chid: channel.id, extid: extensionDocument._id }, err);
		}
	}
};
