const discordOAuthScopes = ["identify", "guilds", "email"];
const { renderError } = require("../helpers");

const controllers = module.exports;

// Builders
controllers.buildLoginController = router => router.app.passport.authenticate("discord", {
	scope: discordOAuthScopes,
});

// Controllers
controllers.logout = (req, res) => {
	req.logout();
	res.redirect("/activity");
};

controllers.authenticate = (req, res) => {
	if (configJSON.userBlocklist.indexOf(req.user.id) > -1 || req.user.verified === false) {
		req.session.destroy(err => {
			if (!err) renderError(res, "Your Discord account must have a verified email.", "<strong>Hah!</strong> Thought you were close, didn'tcha?");
			else renderError(res, "Failed to destroy your session.");
		});
	} else {
		res.redirect("/dashboard");
	}
};
