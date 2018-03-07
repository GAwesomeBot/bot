const moment = require("moment");
const { parseAuthUser, getRoundedUptime } = require("../helpers");

module.exports = async (req, res) => {
	const uptime = process.uptime();
	const guildSize = req.app.client.guilds.totalCount;
	const userSize = req.app.client.users.totalCount;
	res.render("pages/landing.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		bannerMessage: configJSON.homepageMessageHTML,
		rawServerCount: await guildSize,
		roundedServerCount: Math.floor(await guildSize / 100) * 100,
		rawUserCount: `${Math.floor(await userSize / 1000)}K`,
		rawUptime: moment.duration(uptime, "seconds").humanize(),
		roundedUptime: getRoundedUptime(uptime),
	});
};
