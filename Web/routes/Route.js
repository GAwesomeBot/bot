class Route {
	constructor (router, route, middleware, controller, method, type) {
		const mw = require("../middleware");

		// Set parameters
		this.router = router;
		this.route = route;
		this.controller = controller;
		this.isAPI = type === "api";
		this.isStatic = type === "static";
		this.state = "open";

		// Create wrapper for error handling
		this.wrapper = async (req, res, next) => {
			try {
				await this.controller(req, res, next);
			} catch (err) {
				winston.warn(`An error occurred during a ${req.protocol} ${req.method} request on ${req.path} 0.0\n`, { params: req.params, query: req.query }, err);
				require("../helpers").renderError(res, "Something went wrong!");
			}
		};

		this.rawMiddleware = [mw.populateRequest(this), ...middleware, this.wrapper];

		// Register middleware to route in router
		router[method || "get"](route, this.middleware);
	}

	close (soft) {
		this.state = soft ? "unavailable" : "closed";
	}

	open () {
		this.state = "open";
	}

	get middleware () {
		switch (this.state) {
			case "open":
				return this.rawMiddleware;
			case "unavailable":
				return [require("../helpers").renderUnavailable];
			case "closed":
				return [];
		}
	}
}

class DashboardRoute extends Route {
	constructor (router, route, middleware, middlewarePOST, controller, controllerPOST) {
		const mw = require("../middleware");

		// Prepare Dashboard Middleware
		middleware.push(mw.authorizeDashboardAccess);
		super(router, route, middleware, controller, "get", "dashboard");

		// Create final Middleware passed to the router, and cache it for hot reloading
		this.rawPostMiddleware = [mw.populateRequest(this), ...middlewarePOST, controllerPOST];

		// Register middleware to route in router
		router.post(route, this.postMiddleware);
	}

	get postMiddleware () {
		switch (this.state) {
			case "open":
				return this.rawPostMiddleware;
			case "unavailable":
				return [(req, res) => res.sendStatus(503)];
			case "closed":
				return [];
		}
	}
}

class MaintainerDashboardRoute extends DashboardRoute {

}

module.exports = {
	Route,
	DashboardRoute,
	MaintainerDashboardRoute,
};
