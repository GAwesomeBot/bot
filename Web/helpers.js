const mw = require("./middleware");

module.exports = {
	denyRequest: (res, isAPI) => isAPI ? res.sendStatus(403) : res.status(403).redirect("/dashboard"),

	renderUnavailable: (req, res) => res.status(503).render("pages/503.ejs", {}),

	renderError: (res, text, line, code = 500) => res.status(code).render("pages/error.ejs", { error_text: text, error_line: line || configJS.errorLines[Math.floor(Math.random() * configJS.errorLines.length)] }),

	checkSudoMode: id => configJSON.perms.sudoMode === 0 ? process.env.GAB_HOST === id : (configJSON.perms.sudoMode === 2 ? configJSON.sudoMaintainers.includes(id) : configJSON.maintainers.includes(id)),

	setupPage: (app, route, middleware, controller, acceptSockets = false) => {
		middleware = [mw.checkUnavailable, ...middleware, mw.registerTraffic];
		app.routes.push(new (require("./routes/Route")).Route(app, route, middleware, controller, "get", "general"));
		if (acceptSockets) {
			app.io.of(route).on("connection", socket => {
				socket.on("disconnect", () => undefined);
			});
		}
	},

	setupDashboardPage: (app, route, middleware, controller, middlewarePOST = []) => {
		middleware = [mw.checkUnavailable, ...middleware, mw.registerTraffic];
		middlewarePOST = [mw.checkUnavailableAPI, ...middlewarePOST];
		app.routes.push(new (require("./routes/Route")).DashboardRoute(app, route, middleware, middlewarePOST, controller, controller.post ? controller.post : (req, res) => res.sendStatus(405)));
		app.io.of(route).on("connection", socket => {
			socket.on("disconnect", () => undefined);
		});
	},

	saveAdminConsoleOptions: (req, res, override) => {

	},

	setupResource: (app, route, middleware, controller, method, authType) => {
		const authMiddleware = [];
		if (authType === "authentication" || authType === "authorization") authMiddleware.push(mw.authenticateResourceRequest);
		if (authType === "authorization") authMiddleware.push(mw.authorizeResourceRequest);
		if (authMiddleware.length) middleware = [mw.checkUnavailableAPI, ...authMiddleware, ...middleware];
		else middleware = [mw.checkUnavailableAPI, ...middleware];

		app.routes.push(new (require("./routes/Route")).Route(app, `/api${route}`, middleware, controller, method, "API"));
	},

	setupRedirection: (app, route, redirection) => {
		app.routes.push(new (require("./routes/Route")).Route(app, route, [], (req, res) => res.redirect(redirection), "get", "redirection"));
	},

	parseAuthUser: user => ({
		username: user.username,
		id: user.id,
		avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : "/static/img/discord-icon.png",
	}),

	getRoundedUptime: uptime => uptime > 86400 ? `${Math.floor(uptime / 86400)}d` : `${Math.floor(uptime / 3600)}h`,

	createMessageOfTheDay: (req, id) => req.bot.IPC.send("createMOTD", { guild: id }),

	dashboardUpdate: (req, namespace, location) => req.client.IPC.send("dashboardUpdate", { namespace: namespace, location: location }),

	getRoleData: svr => Object.values(svr.roles).filter(role => role.name !== "@everyone" && role.name.indexOf("color-") !== 0).map(role => ({
		name: role.name,
		id: role.id,
		color: role.hexColor.substring(1),
		position: role.position,
	})).sort((a, b) => b.position - a.position),

	getChannelData: (svr, type) => Object.values(svr.channels).filter(ch => ch.type === (type || "text")).map(ch => ({
		name: ch.name,
		id: ch.id,
		position: ch.position,
		rawPosition: ch.rawPosition,
	})).sort((a, b) => a.rawPosition - b.rawPosition),

	getUserList: list => list.filter(usr => usr.bot !== true).map(usr => `${usr.username}#${usr.discriminator}`).sort(),

	findQueryUser: (query, list) => {
		let usr = list[query];
		if(!usr) {
			const usernameQuery = query.substring(0, query.lastIndexOf("#")>-1 ? query.lastIndexOf("#") : query.length);
			const discriminatorQuery = query.indexOf("#")>-1 ? query.substring(query.lastIndexOf("#")+1) : "";
			const usrs = Object.values(list).filter(a => {
				return (a.user || a).username === usernameQuery;
			});
			if(discriminatorQuery) {
				usr = usrs.find(a => {
					return (a.user || a).discriminator === discriminatorQuery;
				});
			} else if(usrs.length>0) {
				usr = usrs[0];
			}
		}
		return usr;
	},

	generateCodeID: code => require("crypto")
		.createHash("md5")
		.update(code, "utf8")
		.digest("hex"),
};
