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
	const redirect = () => res.redirect(`/dashboard/${req.query.guild_id}/setup?permissions=${req.query.permissions}`);

	if (configJSON.userBlocklist.indexOf(req.user.id) > -1 || req.user.verified === false) {
		req.session.destroy(err => {
			if (!err) renderError(res, "Your Discord account must have a verified email.", "<strong>Hah!</strong> Thought you were close, didn'tcha?");
			else renderError(res, "Failed to destroy your session.");
		});
	} else if (req.query.guild_id && req.query.permissions) {
		const serverDocument = Servers.findOne(req.query.guild_id);
		if (serverDocument) return redirect();
		else return setTimeout(redirect, 1000);
	} else {
		res.redirect("/dashboard");
	}
};
