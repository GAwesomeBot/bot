const middleware = module.exports;

middleware.populateRequest = route => (req, res, next) => {
	// App Libraries
	req.client = req.bot = route.router.bot;
	req.passport = route.router.passport;

	// Request information
	req.isAPI = route.isAPI;
	req.isStatic = route.isStatic;
	req.isBusy = route.router.toobusy();
	req.debugMode = route.router.get("debug mode");
	next();
};

middleware.registerTraffic = (req, res, next) => {
	if (!req.cookies.trafficID || req.cookies.trafficID !== req.bot.traffic.TID) {
		let TID = req.bot.traffic.TID;
		res.cookie("trafficID", TID, { httpOnly: true });
	}
	req.bot.traffic.count(req.cookies.trafficID, req.isAuthenticated());
	next();
};

middleware.checkUnavailable = (req, res, next) => {
	if (global.isUnavailable || req.isBusy) return res.status(503).render("pages/503.ejs", {});
	next();
};

middleware.checkUnavailableAPI = (req, res, next) => {
	if (global.isUnavailable || req.isBusy) return res.sendStatus(503);
	next();
};

middleware.enforceProtocol = (req, res, next) => {
	if (!req.secure) {
		return res.redirect(`https://${req.hostname}:${global.configJS.httpsPort}${req.url}`);
	}
	next();
};

middleware.setHeaders = (req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Credentials", true);
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
};

middleware.logRequest = (req, res, next) => {
	winston.verbose(`Incoming ${req.protocol} ${req.method} on ${req.path}.`, { params: req.params, query: req.query, protocol: req.protocol, method: req.method, path: req.path });
	next();
};

require("./auth")(middleware);
