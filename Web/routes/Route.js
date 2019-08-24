class Route {
	constructor (router, route, middleware, controller, method, type, parent) {
		const mw = require("../middleware");

		// Set parameters
		this.router = router;
		this.route = route;
		this.controller = controller;
		this.isAPI = type === "api";
		this.isStatic = type === "static";
		this.state = "open";
		this.parentRoute = parent;
		if (!["static", "auth", "special"].includes(type)) this.advanced = true;

		// Create wrapper for error handling
		this.wrapper = async (req, res, next) => {
			try {
				await this.controller(req, res, next);
			} catch (err) {
				logger.warn(`An error occurred during a ${req.protocol} ${req.method} request on ${req.path} 0.0`, { params: req.params, query: req.query }, err);
				require("../helpers").renderError(res, "Something went wrong!");
			}
		};

		this.middleware = [mw.populateRequest(this), ...middleware, this.wrapper];

		// Register middleware to route in router
		router[method || "get"](route, this.middleware);
	}
}

class DashboardRoute extends Route {
	constructor (router, route, middleware, middlewarePOST, controller, controllerPOST, pullEndpointKey) {
		const mw = require("../middleware");

		// Prepare Dashboard Middleware
		middleware = [mw.authorizeDashboardAccess, ...middleware];
		super(router, route, middleware, controller, "get", "dashboard");
		this.postMiddleware = middlewarePOST = [mw.authorizeDashboardAccess, ...middlewarePOST];

		// Register middleware to route in router
		this.postRoute = new Route(router, route, this.postMiddleware, controllerPOST, "post", "dashboard", this);

		if (pullEndpointKey) {
			this.deleteRoute = new Route(router, `${route}/:id`, this.postMiddleware, require("../controllers/dashboard/delete")(pullEndpointKey), "delete", "dashboard", this);
		}
	}
}

class ConsoleRoute extends Route {
	constructor (router, route, permission, middleware, middlewarePOST, controller, controllerPOST) {
		const mw = require("../middleware");

		middleware = [mw.authorizeConsoleAccess, ...middleware];
		super(router, route, middleware, controller, "get", "console");
		this.postMiddleware = middlewarePOST = [mw.authorizeConsoleAccess, ...middlewarePOST];
		this.perm = permission;
		this.advanced = true;

		this.postRoute = new Route(router, route, this.postMiddleware, controllerPOST, "post", "console", this);
		this.postRoute.perm = permission;
		this.postRoute.advanced = true;
	}
}

module.exports = {
	Route,
	DashboardRoute,
	ConsoleRoute,
};
