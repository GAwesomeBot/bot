const { setupPage } = require("../helpers");
const controllers = require("../controllers");

module.exports = router => {
	setupPage(router, "/503", [], controllers.debug["503"]);
};
