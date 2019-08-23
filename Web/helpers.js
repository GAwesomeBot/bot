/* eslint-disable max-len */
const fs = require("fs-nextra");

const mw = require("./middleware");
const { LoggingLevels } = require("../Internals/Constants");

module.exports = {
	denyRequest: (res, isAPI) => isAPI ? res.sendStatus(403) : res.status(403).redirect("/dashboard"),

	renderUnavailable: (req, res) => res.status(503).render("pages/503.ejs", {}),

	renderError: (res, text, line, code = 500) => res.status(code).render("pages/error.ejs", { error_text: text, error_line: line || configJS.errorLines[Math.floor(Math.random() * configJS.errorLines.length)] }),

	checkSudoMode: id => configJSON.perms.sudo === 0 ? process.env.GAB_HOST === id : configJSON.perms.sudo === 2 ? configJSON.sudoMaintainers.includes(id) : configJSON.maintainers.includes(id),

	fetchMaintainerPrivileges: id => {
		let permLevel;
		if (process.env.GAB_HOST === id) permLevel = 0;
		else if (configJSON.sudoMaintainers.includes(id)) permLevel = 2;
		else if (configJSON.maintainers.includes(id)) permLevel = 1;
		else return [];
		return Object.keys(configJSON.perms).filter(key => configJSON.perms[key] === permLevel || permLevel === 0 || (permLevel === 2 && configJSON.perms[key] === 1));
	},

	canDo: (action, id) => module.exports.fetchMaintainerPrivileges(id).includes(action),

	setupPage: (router, route, middleware, controller, acceptSockets = false) => {
		middleware = [mw.checkUnavailable, ...middleware, mw.registerTraffic];
		router.routes.push(new (require("./routes/Route")).Route(router, route, middleware, controller, "get", "general"));
		if (acceptSockets) {
			router.app.io.of(route).on("connection", socket => {
				socket.on("disconnect", () => undefined);
				if (controller.socket) controller.socket(socket);
			});
		}
	},

	setupDashboardPage: (router, route, middleware, controller, pullEndpointKey, middlewarePOST = []) => {
		middleware = [mw.checkUnavailable, ...middleware, mw.registerTraffic];
		middlewarePOST = [mw.checkUnavailableAPI, ...middlewarePOST];
		controller.post = controller.post ? controller.post : (req, res) => res.sendStatus(405);
		router.routes.push(new (require("./routes/Route")).DashboardRoute(router, `/:svrid${route}`, middleware, middlewarePOST, controller, controller.post, pullEndpointKey));
		router.app.io.of(`/dashboard/:svrid${route}`).on("connection", socket => {
			if (controller.socket) controller.socket(socket);
		});
	},

	setupConsolePage: (router, route, permission, middleware, controller, middlewarePOST = []) => {
		middleware = [mw.checkUnavailable, ...middleware, mw.registerTraffic];
		middlewarePOST = [mw.checkUnavailableAPI, ...middlewarePOST];
		controller.post = controller.post ? controller.post : (req, res) => res.sendStatus(405);
		const newRoute = new (require("./routes/Route")).ConsoleRoute(router, route, permission, middleware, middlewarePOST, controller, controller.post);
		router.routes.push(newRoute);
		router.app.io.of(`/dashboard/maintainer${route}`).on("connection", socket => {
			if (controller.socket) {
				socket.route = newRoute;
				socket.request.perm = newRoute.perm;
				if (!mw.authorizeConsoleSocketAccess(socket)) return;
				controller.socket(socket);
			}
		});
	},

	saveAdminConsoleOptions: async (req, res, isAPI) => {
		const validationError = req.svr.document.validate();
		if (validationError) {
			logger.debug(`A (malformed) ${req.method} request at ${req.originalURL} resulted in an invalid document:`, {}, validationError);
			return isAPI ? res.sendStatus(400) : module.exports.renderError(res, "Your request is malformed.", null, 400);
		}
		try {
			req.app.client.logMessage(req.svr.document, LoggingLevels.SAVE, `Changes were saved in the Admin Console at section ${req.path.replace(`/${req.svr.id}`, "")}.`, null, req.consolemember.user.id);
			module.exports.dashboardUpdate(req, `/dashboard${req.path}`, req.svr.id);
			await req.svr.document.save();
			if (isAPI) {
				res.sendStatus(200);
			} else {
				res.redirect(`${req.originalUrl}`);
			}
		} catch (err) {
			logger.warn(`Failed to update admin console settings at ${req.path} '-'`, { svrid: req.svr.id, usrid: req.consolemember.user.id }, err);
			module.exports.renderError(res, "An internal error occurred!");
		}
	},

	saveMaintainerConsoleOptions: async (req, res, isAPI, silent) => {
		fs.writeJSONAtomic(`${__dirname}/../Configurations/config.json`, configJSON, { spaces: 2 })
			.then(() => {
				module.exports.dashboardUpdate(req, req.path, "maintainer");
				if (isAPI && !silent) {
					res.sendStatus(200);
				} else if (!silent) {
					res.redirect(req.originalUrl);
				}
			})
			.catch(err => {
				logger.error(`Failed to update maintainer settings at ${req.path} '-'`, { usrid: req.consolemember && req.consolemember.user.id }, err);
				module.exports.renderError(res, "An internal error occurred!");
			});
	},

	setupResource: (router, route, middleware, controller, method, authType) => {
		const authMiddleware = [];
		if (authType === "authentication" || authType === "authorization") authMiddleware.push(mw.authenticateResourceRequest);
		if (authType === "authorization") authMiddleware.push(mw.authorizeResourceRequest);
		if (authMiddleware.length) middleware = [mw.checkUnavailableAPI, ...authMiddleware, ...middleware];
		else middleware = [mw.checkUnavailableAPI, ...middleware];

		router.routes.push(new (require("./routes/Route")).Route(router, `${route}`, middleware, controller, method, "API"));
	},

	setupRedirection: (router, route, redirection) => {
		router.routes.push(new (require("./routes/Route")).Route(router, route, [], (req, res) => res.redirect(redirection), "get", "redirection"));
	},

	parseAuthUser: user => ({
		username: user.username,
		id: user.id,
		avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : "/static/img/discord-icon.png",
	}),

	getRoundedUptime: uptime => uptime > 86400 ? `${Math.floor(uptime / 86400)}d` : `${Math.floor(uptime / 3600)}h`,

	createMessageOfTheDay: (req, id) => req.app.client.IPC.send("createMOTD", { guild: id }),

	dashboardUpdate: (req, namespace, location) => req.app.client.IPC.send("dashboardUpdate", { namespace: namespace, location: location, author: req.consolemember ? req.consolemember.id : "SYSTEM" }),

	getRoleData: svr => svr.roles.filter(role => role.name !== "@everyone" && role.name.indexOf("color-") !== 0).map(role => ({
		name: role.name,
		id: role.id,
		color: role.color.toString(16).padStart(6, "0"),
		position: role.rawPosition,
	}))
		.sort((a, b) => b.position - a.position),

	getChannelData: (svr, type) => svr.channels.filter(ch => ch.type === (type || "text")).map(ch => ({
		name: ch.name,
		id: ch.id,
		position: ch.rawPosition,
		rawPosition: ch.rawPosition,
	}))
		.sort((a, b) => a.rawPosition - b.rawPosition),

	getUserList: list => list.filter(usr => usr.bot !== true).map(usr => `${usr.username}#${usr.discriminator}`).sort(),

	findQueryUser: (query, guild) => guild.fetchMember(query, true),

	generateCodeID: code => require("crypto")
		.createHash("md5")
		.update(code, "utf8")
		.digest("hex"),

	validateExtensionData: data => ((data.type === "command" && data.key) || (data.type === "keyword" && data.keywords) || (data.type === "timer" && data.interval) || (data.type === "event" && data.event)) && data.code,
	pushExtensionVersionData: (extensionDocument, data) => {
		const extensionQueryDocument = extensionDocument.query;
		const currentVersion = extensionDocument.versions.id(extensionDocument.version) || { _id: 0 };
		const newVersion = { _id: currentVersion._id, accepted: currentVersion.accepted };
		newVersion.type = data.type;

		newVersion.key = data.type === "command" ? data.key : null;
		newVersion.usage_help = data.type === "command" ? data.usage_help : null;
		newVersion.extended_help = data.type === "command" ? data.extended_help : null;

		newVersion.keywords = data.keywords ? data.keywords.split(",") : [];
		newVersion.case_sensitive = data.case_sensitive === "on";

		newVersion.interval = data.type === "timer" ? parseInt(data.interval) : null;

		newVersion.event = data.type === "event" ? data.event : null;

		newVersion.timeout = parseInt(data.timeout);
		newVersion.code_id = module.exports.generateCodeID(data.code);
		newVersion.scopes = [];
		Object.keys(data).forEach(val => {
			if (val.startsWith("scope_") && data[val]) newVersion.scopes.push(val.split("scope_")[1]);
		});

		if (!Object.keys(newVersion).some(key => JSON.stringify(newVersion[key]) !== JSON.stringify(currentVersion[key]))) return false;
		newVersion._id++;
		newVersion.accepted = null;
		extensionQueryDocument.push("versions", newVersion);
		return newVersion._id;
	},
	writeExtensionData: (extensionDocument, data) => {
		const extensionQueryDocument = extensionDocument.query;
		extensionQueryDocument.set("name", data.name)
			.set("last_updated", Date.now());

		const versionTag = module.exports.pushExtensionVersionData(extensionDocument, data);
		if (!versionTag) return false;
		extensionQueryDocument.set("version", versionTag);
		return versionTag;
	},
};
