const { setupConsolePage, setupRedirection } = require("../helpers");
const controllers = require("../controllers");

module.exports = router => {
	setupRedirection(router, "/", "/maintainer");
	setupConsolePage(router, "/maintainer", "maintainer", [], controllers.console.maintainer);
};
