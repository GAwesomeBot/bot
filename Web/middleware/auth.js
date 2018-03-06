const { renderError, checkSudoMode } = require('../helpers');
const getGuild = require('../../Modules').GetGuild;

module.exports = middleware => {
	// Middleware

	// Populate a request with Authorization details
	middleware.authorizeGuildAccess = async (req, res, next) => {
		// Do not populate request if authorization is not required
		if (!req.params.svrid && !req.query.svrid) return next();
		// Confirm user is authenticated
		if (req.isAuthenticated()) {
			// Fetch user data from Discord
			const usr = await req.bot.users.fetch(req.user.id, true);
			if (usr) {
				// Legacy URL support
				if (!req.params.svrid && req.query.svrid) req.params.svrid = req.query.svrid;
				// Get server data from shard that has said server cached
				const svr = await getGuild.get(req.bot, req.params.svrid, {
					resolve: ['id', 'ownerID', 'name', 'icon'],
					members: ['id', 'roles', 'user', 'nickname'],
					channels: ['id', 'type', 'name', 'position', 'rawPosition'],
					roles: ['name', 'id', 'position', 'hexColor'],
					convert: {id_only: true},
				});
				// Confirm the svr and usr exist
				if (svr) {
					// Get server data from Database
					let serverDocument;
					try {
						serverDocument = await Servers.findOne({_id: svr.id}).exec();
					} catch (err) {
						if (req.isAPI) return res.sendStatus(500);
						renderError(res, 'Something went wrong while fetching your server data.');
					}
					if (!serverDocument) {
						if (req.isAPI) return res.sendStatus(500);
						return renderError(res, 'Something went wrong while fetching your server data.')
					}
					// Authorize the user's request
					const member = svr.members[usr.id];
					const adminLevel = req.bot.getUserBotAdmin(svr, serverDocument, member);
					if (adminLevel >= 3 || checkSudoMode(usr.id)) {
						// Populate the request object with Authorization details
						try {
							req.isAuthorized = true;
							req.consolemember = member;
							req.consolemember.level = adminLevel;
							req.svr = svr;
							req.svr.document = serverDocument;
							next();
						} catch (err) {
							winston.warn(`An error occurred during a ${req.protocol} ${req.method} request on ${req.path} 0.0\n`, {
								params: req.params,
								query: req.query
							}, err);
							if (req.isAPI) return res.sendStatus(500);
							renderError(res, 'An unknown error occurred.');
						}
					} else {
						if (req.isAPI) return res.sendStatus(403);
						res.redirect('/dashboard');
					}
				} else {
					if (req.isAPI) return res.sendStatus(404);
					renderError(res, 'Wait a second, that server doesn\'t exist!<br>We failed to fetch your server from Discord.');
				}
			} else {
				if (req.isAPI) return res.sendStatus(500);
				renderError(res, 'Wait, do you exist?<br>We failed to fetch your user from Discord.');
			}
		} else {
			if (req.isAPI) return res.sendStatus(401);
			res.redirect('/login');
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
		if (req.isAuthenticated()) next();
		else res.sendStatus(401);
	};

	middleware.authorizeResourceRequest = async (req, res, next) => {
		if (req.params.usrid && req.params.usrid === req.user.id) next();
		else if (req.params.svrid) return middleware.authorizeGuildAccess(req, res, next);
		else res.sendStatus(403);
	};

	middleware.authorizeWikiAccess = (req, res, next) => {
		if (req.isAuthenticated()) {
			if (configJSON.wikiContributors.includes(req.user.id) || configJSON.maintainers.includes(req.user.id)) {
				next();
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
				next();
			} else {
				renderError(res, "You are not authorized to access this page.", "<strong>You</strong> shall not pass!");
			}
		} else {
			res.redirect("/login");
		}
	};

	// Builders
	middleware.buildAuthenticateMiddleware = router => router.passport.authenticate("discord", {
		failureRedirect: "/error?err=discord",
	});
};
