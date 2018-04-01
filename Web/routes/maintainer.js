const { setupConsolePage, setupRedirection } = require("../helpers");
const controllers = require("../controllers");

module.exports = router => {
	setupRedirection(router, "/", "/maintainer");
	setupConsolePage(router, "/maintainer", "maintainer", [], controllers.console.maintainer);
	setupConsolePage(router, "/servers/server-list", "maintainer", [], controllers.console.servers.list);
	setupConsolePage(router, "/servers/big-message", "maintainer", [], controllers.console.servers.bigmessage);
	setupConsolePage(router, "/global-options/blocklist", "administration", [], controllers.console.options.blocklist);
	setupConsolePage(router, "/global-options/bot-user", "administration", [], controllers.console.options.bot);
	setupConsolePage(router, "/global-options/homepage", "administration", [], controllers.console.options.homepage);
};
