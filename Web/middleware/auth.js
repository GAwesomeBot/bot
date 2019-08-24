const { renderError, checkSudoMode, canDo } = require("../helpers");
const { GetGuild } = require("../../Modules").getGuild;

module.exports = middleware => {
	// Middleware

	// Populate a request with Authorization details
	middleware.authorizeGuildAccess = async (req, res, next) => {
		// Do not populate request if authorization is not required
		if (!req.params.svrid && !req.query.svrid) return next();
		// Confirm user is authenticated
		if (req.isAuthenticated()) {
			// Fetch user data from Discord
			const usr = await req.app.client.users.fetch(req.user.id, true);
			if (usr) {
				// Legacy URL support
				if (!req.params.svrid && req.query.svrid) req.params.svrid = req.query.svrid;
				// Get server data from shard that has said server cached
				const svr = new GetGuild(req.app.client, req.params.svrid);
				await svr.initialize([usr.id, "OWNER", req.app.client.user.id]);
				// Confirm the svr and usr exist
				if (svr.success) {
					// Get server data from Database
					let serverDocument;
					try {
						serverDocument = await Servers.findOne(svr.id);
					} catch (err) {
						if (req.isAPI) return res.sendStatus(500);
						renderError(res, "Something went wrong while fetching your server data.");
					}
					if (!serverDocument) {
						if (req.isAPI) return res.sendStatus(500);
						return renderError(res, "Something went wrong while fetching your server data.");
					}
					// Authorize the user's request
					const member = svr.members[usr.id];
					const adminLevel = req.app.client.getUserBotAdmin(svr, serverDocument, member);
					if (adminLevel >= 3 || checkSudoMode(usr.id)) {
						// Populate the request object with Authorization details
						try {
							req.isAuthorized = true;
							req.isSudo = adminLevel !== 3;
							req.consolemember = member;
							req.consolemember.level = adminLevel;
							req.svr = svr;
							req.svr.document = serverDocument;
							req.svr.queryDocument = serverDocument.query;
							res.res.populateDashboard(req);
							return next();
						} catch (err) {
							logger.warn(`An error occurred during a ${req.protocol} ${req.method} request on ${req.path} 0.0`, {
								params: req.params,
								query: req.query,
							}, err);
							if (req.isAPI) return res.sendStatus(500);
							renderError(res, "An unknown error occurred.");
						}
					} else {
						if (req.isAPI) return res.sendStatus(403);
						res.redirect("/dashboard");
					}
				} else {
					if (req.isAPI) return res.sendStatus(404);
					renderError(res, "Wait a second, that server doesn't exist!<br>We failed to fetch your server from Discord.");
				}
			} else {
				if (req.isAPI) return res.sendStatus(500);
				renderError(res, "Wait, do you exist?<br>We failed to fetch your user from Discord.");
			}
		} else {
			if (req.isAPI) return res.sendStatus(401);
			res.redirect("/login");
		}
	};

	middleware.authorizeConsoleAccess = (req, res, next) => {
		if (req.isAuthenticated()) {
			if (configJSON.maintainers.includes(req.user.id)) {
				const { perm } = req;
				if (perm === "maintainer" || canDo(perm, req.user.id)) {
					req.isAuthorized = true;
					req.level = process.env.GAB_HOST !== req.user.id ? configJSON.sudoMaintainers.includes(req.user.id) ? 2 : 1 : 0;
					res.res.template.isSudoMaintainer = req.level === 2 || req.level === 0;
					res.res.template.isHost = req.level === 0;
					return next();
				} else {
					if (req.isAPI) return res.sendStatus(403);
					res.redirect("/dashboard");
				}
			} else {
				if (req.isAPI) return res.sendStatus(403);
				res.redirect("/dashboard");
			}
		} else {
			if (req.isAPI) return res.sendStatus(401);
			res.redirect("/login");
		}
	};

	middleware.authorizeDashboardAccess = (req, res, next) => {
		if (!req.params.svrid && !req.query.svrid) {
			if (req.isAPI) return res.sendStatus(400);
			return res.redirect("/dashboard");
		}
		middleware.authorizeGuildAccess(req, res, next);
	};

	middleware.authenticateResourceRequest = (req, res, next) => {
		if (req.isAuthenticated()) return next();
		else res.sendStatus(401);
	};

	middleware.authorizeResourceRequest = async (req, res, next) => {
		if (req.params.usrid && req.params.usrid === req.user.id) return next();
		else if (req.params.svrid) return middleware.authorizeGuildAccess(req, res, next);
		else res.sendStatus(403);
	};

	middleware.authorizeWikiAccess = (req, res, next) => {
		if (req.isAuthenticated()) {
			if (configJSON.wikiContributors.includes(req.user.id) || configJSON.maintainers.includes(req.user.id)) {
				return next();
			} else {
				renderError(res, "You are not authorized to access this page.", "<strong>You</strong> shall not pass!");
			}
		} else {
			res.redirect("/login");
		}
	};

	middleware.authorizeBlogAccess = (req, res, next) => {
		if (req.isAuthenticated()) {
			if (configJSON.maintainers.includes(req.user.id)) {
				return next();
			} else {
				renderError(res, "You are not authorized to access this page.", "<strong>You</strong> shall not pass!");
			}
		} else {
			res.redirect("/login");
		}
	};

	middleware.authorizeConsoleSocketAccess = socket => {
		if (socket.request.user && socket.request.user.logged_in) {
			if (configJSON.maintainers.includes(socket.request.user.id)) {
				const { perm } = socket.request;
				if (perm === "maintainer" || canDo(perm, socket.request.user.id)) {
					socket.request.isAuthorized = true;
					socket.request.level = process.env.GAB_HOST !== socket.request.user.id ? configJSON.sudoMaintainers.includes(socket.request.user.id) ? 2 : 1 : 0;
					return true;
				} else {
					socket.emit("err", { error: 403, fatal: true });
					socket.disconnect();
					return false;
				}
			} else {
				socket.emit("err", { error: 403, fatal: true });
				socket.disconnect();
				return false;
			}
		} else {
			socket.emit("err", { error: 401, fatal: true });
			socket.disconnect();
			return false;
		}
	};

	// Builders
	middleware.buildAuthenticateMiddleware = router => router.app.passport.authenticate("discord", {
		failureRedirect: "/error?err=discord",
	});
};
