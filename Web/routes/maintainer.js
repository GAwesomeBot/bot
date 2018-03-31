const { setupConsolePage, setupRedirection } = require("../helpers");
const controllers = require("../controllers");

module.exports = router => {
	setupRedirection(router, "/", "/maintainer");
	setupConsolePage(router, "/maintainer", "maintainer", [], controllers.console.maintainer);
	setupConsolePage(router, "/servers/server-list", "maintainer", [], controllers.console.servers.list);
};
