const { setupPage, setupDashboardPage } = require("../helpers");
const controllers = require("../controllers");

module.exports = router => {
	// Admin console support for legacy URL's
	router.use("/", (req, res, next) => {
		if (req.query.svrid) {
			res.redirect(307, `/dashboard/${req.query.svrid}${req.path}`);
		} else {
			return next();
		}
	});

	// Dashboard
	setupPage(router, "/", [], controllers.dashboard.home);
	setupDashboardPage(router, "/overview", [], controllers.dashboard.overview);

	// Commands
	setupDashboardPage(router, "/commands/command-options", [], controllers.dashboard.commands.options);
	setupDashboardPage(router, "/commands/command-list", [], controllers.dashboard.commands.list);
	setupDashboardPage(router, "/commands/rss-feeds", [], controllers.dashboard.commands.rss, "rss_feeds");
	setupDashboardPage(router, "/commands/streamers", [], controllers.dashboard.commands.streamers, "streamers_data");
	setupDashboardPage(router, "/commands/tags", [], controllers.dashboard.commands.tags, "tags");
	setupDashboardPage(router, "/commands/auto-translation", [], controllers.dashboard.commands.translation, "translated_messages");
	setupDashboardPage(router, "/commands/trivia-sets", [], controllers.dashboard.commands.trivia, "trivia_sets");
	setupDashboardPage(router, "/commands/api-keys", [], controllers.dashboard.commands.APIKeys);
	setupDashboardPage(router, "/commands/tag-reaction", [], controllers.dashboard.commands.reaction);

	// Stats and Points
	setupDashboardPage(router, "/stats-points/stats-collection", [], controllers.dashboard.stats.collection);
	setupDashboardPage(router, "/stats-points/ranks", [], controllers.dashboard.stats.ranks, "ranks_list");
	setupDashboardPage(router, "/stats-points/gawesome-points", [], controllers.dashboard.stats.points);

	// Administration
	setupDashboardPage(router, "/administration/admins", [], controllers.dashboard.administration.admins, "admins");
	setupDashboardPage(router, "/administration/moderation", [], controllers.dashboard.administration.moderation);
	setupDashboardPage(router, "/administration/blocked", [], controllers.dashboard.administration.blocked, "blocked");
	setupDashboardPage(router, "/administration/muted", [], controllers.dashboard.administration.muted, "muted");
	setupDashboardPage(router, "/administration/strikes", [], controllers.dashboard.administration.strikes);
	setupDashboardPage(router, "/administration/status-messages", [], controllers.dashboard.administration.status);
	setupDashboardPage(router, "/administration/filters", [], controllers.dashboard.administration.filters);
	setupDashboardPage(router, "/administration/message-of-the-day", [], controllers.dashboard.administration.MOTD);
	setupDashboardPage(router, "/administration/voicetext-channels", [], controllers.dashboard.administration.voicetext);
	setupDashboardPage(router, "/administration/roles", [], controllers.dashboard.administration.roles);
	setupDashboardPage(router, "/administration/logs", [], controllers.dashboard.administration.logs);

	// Other
	setupDashboardPage(router, "/other/name-display", [], controllers.dashboard.other.nameDisplay);
	setupDashboardPage(router, "/other/ongoing-activities", [], controllers.dashboard.other.activities);
	setupDashboardPage(router, "/other/public-data", [], controllers.dashboard.other.public);
	setupDashboardPage(router, "/other/extensions", [], controllers.dashboard.other.extensions, "extensions");
	setupDashboardPage(router, "/other/extension-builder", [], controllers.dashboard.other.extensionBuilder);
	setupDashboardPage(router, "/other/export", [], controllers.dashboard.other.export);
};
