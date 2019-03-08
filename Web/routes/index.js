const express = require("express");

const { setupPage, setupRedirection } = require("../helpers");
const controllers = require("../controllers");
const middleware = require("../middleware");
const { Route } = require("./Route");

const dashboardRouting = require("./dashboard");
const maintainerDashboardRouting = require("./maintainer");
const debugRouting = require("./debug");
const setupAPI = require("./api");

const generalRouting = router => {
	setupPage(router, "/", [], controllers.landing);
	setupPage(router, "/donate", [], controllers.donate);

	// Special routes that should not be considered "pages"
	router.routes.push(new Route(router, "/header-image", [middleware.checkUnavailableAPI], controllers.headerImage, "get", "static"));
	router.routes.push(new Route(router, "/error", [middleware.checkUnavailable], controllers.error, "get", "special"));
	router.routes.push(new Route(router, "/add", [middleware.checkUnavailable], controllers.add, "get", "special"));

	// Special authentication routes
	router.routes.push(new Route(router, "/logout", [middleware.checkUnavailableAPI], controllers.auth.logout, "get", "auth"));
	router.routes.push(new Route(router, "/login", [middleware.checkUnavailableAPI], controllers.auth.buildLoginController(router), "get", "auth"));
	router.routes.push(new Route(router, "/login/callback", [middleware.checkUnavailableAPI, middleware.buildAuthenticateMiddleware(router)], controllers.auth.authenticate, "get", "auth"));
};

const activityRouting = router => {
	setupRedirection(router, "/activity", "/activity/servers");
	setupPage(router, "/activity/(|servers|users)", [], controllers.activity);
};

const galleryRouting = router => {
	setupRedirection(router, "/extensions", "/extensions/gallery");
	setupPage(router, "/extensions/(|gallery|queue)", [], controllers.extensions.gallery);
	setupPage(router, "/extensions/my", [], controllers.extensions.my, true);
	setupPage(router, "/extensions/builder", [], controllers.extensions.builder, true);
	setupPage(router, "/extensions/:extid/install", [], controllers.extensions.installer);
	router.routes.push(new Route(router, "/extensions/builder", [middleware.checkUnavailable], controllers.extensions.builder.post, "post", "general"));
	router.routes.push(new Route(router, "/extensions/:extid", [middleware.checkUnavailableAPI], controllers.extensions.download, "get", "general"));
	router.routes.push(new Route(router, "/extensions/:extid/:action", [middleware.checkUnavailableAPI], controllers.extensions.gallery.modify, "post", "general"));
};

const wikiRouting = router => {
	setupPage(router, "/wiki", [], controllers.wiki);
	setupRedirection(router, "/wiki/new", "/wiki/new/edit");
	setupPage(router, "/wiki/:id", [], controllers.wiki.readArticle);
	setupPage(router, "/wiki/new/edit", [middleware.authorizeWikiAccess], controllers.wiki.edit);
	setupPage(router, "/wiki/:id/edit", [middleware.authorizeWikiAccess], controllers.wiki.edit);
	setupPage(router, "/wiki/:id/history", [], controllers.wiki.history);
	router.routes.push(new Route(router, "/wiki/new/edit", [middleware.checkUnavailable, middleware.authorizeWikiAccess], controllers.wiki.edit.post, "post", "general"));
	router.routes.push(new Route(router, "/wiki/:id/edit", [middleware.checkUnavailable, middleware.authorizeWikiAccess], controllers.wiki.edit.post, "post", "general"));
	router.routes.push(new Route(router, "/wiki/:id/delete", [middleware.checkUnavailable, middleware.authorizeWikiAccess], controllers.wiki.delete, "post", "general"));
	router.routes.push(new Route(router, "/wiki/:id/react", [middleware.checkUnavailable], controllers.wiki.react, "post", "general"));
};

const blogRouting = router => {
	setupPage(router, "/blog", [], controllers.blog.index);
	setupRedirection(router, "/blog/new", "/blog/new/compose");
	setupPage(router, "/blog/:id", [], controllers.blog.article);
	setupPage(router, "/blog/new/compose", [middleware.authorizeBlogAccess], controllers.blog.article.compose);
	setupPage(router, "/blog/:id/compose", [middleware.authorizeBlogAccess], controllers.blog.article.compose);
	router.routes.push(new Route(router, "/blog/new/compose", [middleware.checkUnavailable, middleware.authorizeBlogAccess], controllers.blog.article.compose.post, "post", "general"));
	router.routes.push(new Route(router, "/blog/:id/compose", [middleware.checkUnavailable, middleware.authorizeBlogAccess], controllers.blog.article.compose.post, "post", "general"));
	router.routes.push(new Route(router, "/blog/:id/delete", [middleware.checkUnavailable, middleware.authorizeBlogAccess], controllers.blog.article.delete, "post", "general"));
	router.routes.push(new Route(router, "/blog/:id/react", [middleware.checkUnavailable], controllers.blog.article.react, "post", "general"));
};

const officialRouting = router => {
	if (!router.app.client.officialMode) return;
	setupPage(router, "/paperwork", [], controllers.paperwork);
};

module.exports = app => {
	const routers = {
		general: express.Router(),
		dashboard: express.Router(),
		maintainerDashboard: express.Router(),
		API: express.Router(),
	};

	Object.keys(routers).forEach(ID => {
		routers[ID].ID = ID;
		routers[ID].routes = [];
		routers[ID].app = app;
	});

	generalRouting(routers.general);
	activityRouting(routers.general);
	galleryRouting(routers.general);
	wikiRouting(routers.general);
	blogRouting(routers.general);
	officialRouting(routers.general);
	dashboardRouting(routers.dashboard);
	maintainerDashboardRouting(routers.maintainerDashboard);
	setupAPI(routers.API);

	if (app.get("debug mode")) debugRouting(routers.general);

	app.use("/dashboard/maintainer", routers.maintainerDashboard);
	app.use("/dashboard", routers.dashboard);
	app.use("/api", routers.API);
	app.use("/", routers.general);

	// 404 Page
	routers.general.routes.push(new Route(routers.general, "*", [middleware.checkUnavailable], controllers.debug["404"], "all", "special"));
};
