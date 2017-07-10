const getSandbox = require("./ExtensionStructures/Sandbox.js");

const domain = require("domain");
const fs = require("fs");
const vm = require("vm");

// Run an extension (command, keyword, or timer)
module.exports = (bot, db, winston, svr, serverDocument, ch, extensionDocument, msg, suffix, keywordMatch) => {
	const extensionSandbox = new vm.createContext(getSandbox(bot, db, winston, extensionDocument, svr, serverDocument, ch, msg, suffix, keywordMatch));
	fs.readFile(`${__dirname}/../Extensions/${svr.id}-${extensionDocument._id}.abext`, "utf8", (err, extensionCode) => {
		if(err) {
			winston.error(`Failed to run ${extensionDocument.type} extension '${extensionDocument.name}'`, {svrid: svr.id, chid: ch.id, extid: extensionDocument._id}, err);
		} else {
			// Run extension in vm2 sandbox
			try {
				const extensionDomain = domain.create();
        			extensionDomain.run(() => {
          				const extensionVM = new vm.Script(extensionCode);
          				extensionVM.runInContext(extensionSandbox, {
            					displayErrors: true,
            					timeout: 10000
					});
       				 });
        			extensionDomain.on("error", err => {
					winston.error(`Failed to run ${extensionDocument.type} extension '${extensionDocument.name}': ${err.stack}`, {svrid: svr.id, chid: ch.id, extid: extensionDocument._id.toString()});
        			});
			} catch(err) {
				winston.error(`Failed to run ${extensionDocument.type} extension '${extensionDocument.name}': ${err.stack}`, {svrid: svr.id, chid: ch.id, extid: extensionDocument._id.toString()});
			}
		}
	});
};
