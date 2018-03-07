const middleware = module.exports;

middleware.populateRequest = route => (req, res, next) => {
	// Request information
	req.isAPI = route.isAPI;
	req.isStatic = route.isStatic;
	req.isBusy = req.app.toobusy();
	req.debugMode = req.app.get("debug mode");
	next();
};

middleware.registerTraffic = (req, res, next) => {
	if (!req.cookies.trafficID || req.cookies.trafficID !== req.app.client.traffic.TID) {
		let TID = req.app.client.traffic.TID;
		res.cookie("trafficID", TID, { httpOnly: true });
	}
	req.app.client.traffic.count(req.cookies.trafficID, req.isAuthenticated());
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
