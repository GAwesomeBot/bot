const { parseAuthUser } = require("../helpers");

module.exports = (req, res) => {
	res.render("pages/donate.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		charities: configJS.donateCharities,
		donate_subtitle: configJS.donateSubtitle,
	});
};
