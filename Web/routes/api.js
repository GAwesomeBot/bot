const RateLimit = require("express-rate-limit");

const { setupResource } = require("../helpers");
const middleware = require("../middleware");
const controllers = require("../controllers");

// GAwesomeBot Data API
module.exports = router => {
	// Configure RateLimit
	router.use("/api/", new RateLimit({
		windowMs: 3600000,
		max: 150,
		delayMs: 0,
	}));

	setupResource(router, "/", [], controllers.api.status, "get", "public");
	setupResource(router, "/servers", [], controllers.api.servers, "get", "public");
	setupResource(router, "/servers/:svrid/channels", [], controllers.api.servers.channels, "get", "authorization");
	setupResource(router, "/list/servers", [], controllers.api.servers.list, "get", "public");
	setupResource(router, "/list/users", [middleware.authorizeGuildAccess], controllers.api.users.list, "get", "public");
	setupResource(router, "/users", [], controllers.api.users, "get", "public");
	setupResource(router, "/extensions", [], controllers.api.extensions, "get", "public");
	setupResource(router, "/*", [], (req, res) => res.sendStatus(404), "all", "public");
};
