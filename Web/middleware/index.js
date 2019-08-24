const { parseAuthUser, fetchMaintainerPrivileges } = require("../helpers");

class GABResponse {
	constructor (req, res, page) {
		this.template = {
			authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
			currentPage: `${req.baseUrl}${req.path}`,
			officialMode: req.app.client.officialMode ? true : undefined,
			adsense: {
				isEnabled: req.cookies.adsPreference !== "false",
				ID: req.app.client.officialMode ? configJS.adsenseID : undefined,
			},
			injection: configJSON.injection,
		};

		this.serverData = {
			name: req.app.client.user.username,
			id: req.app.client.user.id,
			icon: req.app.client.user.displayAvatarURL() || "/static/img/discord-icon.png",
		};
		this.configData = {};
		this.pageData = {};

		if (req.perm && req.user) {
			Object.assign(this.template, {
				isContributor: true,
				isMaintainer: true,
				isSudoMaintainer: req.level === 2 || req.level === 0,
				isHost: req.level === 0,
				accessPrivileges: fetchMaintainerPrivileges(req.user.id),
			});
			this.serverData.isMaintainer = true;
		} else if (req.user) {
			Object.assign(this.template, {
				isContributor: req.isAuthenticated() ? configJSON.wikiContributors.includes(req.user.id) || configJSON.maintainers.includes(req.user.id) : false,
				isMaintainer: req.isAuthenticated() ? configJSON.maintainers.includes(parseAuthUser(req.user).id) : false,
				isSudoMaintainer: req.isAuthenticated() ? configJSON.sudoMaintainers.includes(parseAuthUser(req.user).id) : false,
			});
		} else {
			Object.assign(this.template, {
				isContributor: false,
				isMaintainer: false,
				isSudoMaintainer: false,
			});
		}

		this._client = req.app.client;
		this._page = page;
		this.sendStatus = res.sendStatus.bind(res);
		this.status = res.status.bind(res);
		this.redirect = res.redirect.bind(res);
		this.json = res.json.bind(res);
		this._render = res.render.bind(res);
	}

	setConfigData (key, data) {
		if (!data && typeof key === "object") {
			this.configData = key;
		} else {
			this.configData[key] = data;
		}
		return this;
	}

	setPageData (key, data) {
		if (!data && typeof key === "object") {
			this.pageData = key;
		} else {
			this.pageData[key] = data;
		}
		return this;
	}

	setServerData (key, data) {
		if (!data && typeof key === "object") {
			this.serverData = key;
		} else {
			this.serverData[key] = data;
		}
		return this;
	}

	async render (page, template) {
		if (!page && !this.pageData.page) return this.sendStatus(500);
		if (!page) page = `pages/${this.pageData.page}`;
		this._render(page, template || {
			...this.template,
			serverData: this.serverData,
			configData: this.configData,
			pageData: this.pageData,
		});
		return this;
	}

	populateDashboard (req) {
		if (!req.svr.members[req.svr.ownerID]) req.svr.members[req.svr.ownerID] = { user: { username: "invalid-user", id: "invalid-user" } };
		this.serverData = {
			name: req.svr.name,
			id: req.svr.id,
			icon: req.app.client.getAvatarURL(req.svr.id, req.svr.icon, "icons") || "/static/img/discord-icon.png",
			owner: {
				username: req.svr.members[req.svr.ownerID].user.username,
				id: req.svr.members[req.svr.ownerID].user.id,
				avatar: req.app.client.getAvatarURL(req.svr.members[req.svr.ownerID].user.id, req.svr.members[req.svr.ownerID].user.avatar) || "/static/img/discord-icon.png",
			},
		};
		this.template.sudo = req.isSudo;
	}
}

const middleware = module.exports;

middleware.populateRequest = route => (req, res, next) => {
	// Request information
	req.isAPI = route.isAPI;
	req.isStatic = route.isStatic;
	req.perm = route.perm;
	req.isBusy = req.app.toobusy();
	req.debugMode = req.app.get("debug mode");

	// Response object
	if (route.advanced) res.res = new GABResponse(req, res);
	next();
};

middleware.registerTraffic = (req, res, next) => {
	if (!req.cookies.trafficID || req.cookies.trafficID !== req.app.client.traffic.TID) {
		const { TID } = req.app.client.traffic;
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
	// eslint-disable-next-line max-len
	logger.verbose(`Incoming ${req.protocol} ${req.method} on ${req.path}.`, { params: req.params, query: req.query, protocol: req.protocol, method: req.method, path: req.path, useragent: req.header("User-Agent") });
	next();
};

middleware.getConsoleSection = (req, res, next) => {
	[, req.section] = req.path.split("/");
	next();
};

require("./auth")(middleware);
