const { setupPage, setupDashboardPage } = require("../helpers");
const controllers = require("../controllers");

module.exports = router => {
	// Admin console support for legacy URL's
	router.use("/dashboard", (req, res, next) => {
		if (req.query.svrid) {
			res.redirect(307, `/dashboard/${req.query.svrid}${req.path}`);
		} else {
			return next();
		}
	});

	setupPage(router, "/dashboard", [], controllers.dashboard.home);
};
