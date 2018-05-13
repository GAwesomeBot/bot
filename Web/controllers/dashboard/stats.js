const { saveAdminConsoleOptions: save, parseAuthUser, getChannelData, getRoleData } = require("../../helpers");
const parsers = require("../../parsers");

const controllers = module.exports;

controllers.collection = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	res.render("pages/admin-stats-collection.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
		},
		channelData: getChannelData(svr),
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			commands: {
				messages: serverDocument.config.commands.messages,
				stats: serverDocument.config.commands.stats,
			},
		},
		commandDescriptions: {
			games: client.getPublicCommandMetadata("games").description,
			messages: client.getPublicCommandMetadata("messages").description,
			stats: client.getPublicCommandMetadata("stats").description,
		},
		commandCategories: {
			games: client.getPublicCommandMetadata("games").category,
			messages: client.getPublicCommandMetadata("messages").category,
			stats: client.getPublicCommandMetadata("stats").category,
		},
	});
};
controllers.collection.post = async (req, res) => {
	parsers.commandOptions(req, "stats", req.body);
	parsers.commandOptions(req, "games", req.body);
	parsers.commandOptions(req, "messages", req.body);

	save(req, res, true);
};

controllers.ranks = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;
	await svr.fetchCollection("roles");

	res.render("pages/admin-ranks.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
		},
		channelData: getChannelData(svr),
		roleData: getRoleData(svr),
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			ranks_list: serverDocument.config.ranks_list.map(a => {
				a.members = serverDocument.members.filter(memberDocument => memberDocument.rank === a._id).length;
				return a;
			}),
		},
	});
};
controllers.ranks.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-name"] && req.body["new-max_score"] && !serverDocument.config.ranks_list.id(req.body["new-name"])) {
		serverDocument.config.ranks_list.push({
			_id: req.body["new-name"],
			max_score: req.body["new-max_score"],
			role_id: req.body["new-role_id"] || null,
		});
	} else if (req.body["ranks_list-reset"]) {
		serverDocument.members.forEach(member => {
			member.rank = "No Rank";
		});
	} else {
		serverDocument.config.ranks_list.forEach(rankDocument => {
			rankDocument.max_score = parseInt(req.body[`rank-${rankDocument._id}-max_score`]);
			if (rankDocument.role_id || req.body[`rank-${rankDocument._id}-role_id`]) {
				rankDocument.role_id = req.body[`rank-${rankDocument._id}-role_id`];
			}
		});
	}
	serverDocument.config.ranks_list = serverDocument.config.ranks_list.sort((a, b) => a.max_score - b.max_score);

	save(req, res, true);
};

controllers.points = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	res.render("pages/admin-gawesome-points.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
		},
		channelData: getChannelData(svr),
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			commands: {
				points: serverDocument.config.commands.points,
				lottery: serverDocument.config.commands.lottery,
			},
		},
		commandDescriptions: {
			points: client.getPublicCommandMetadata("points").description,
			lottery: client.getPublicCommandMetadata("lottery").description,
		},
		commandCategories: {
			points: client.getPublicCommandMetadata("points").category,
			lottery: client.getPublicCommandMetadata("lottery").category,
		},
	});
};
controllers.points.post = async (req, res) => {
	parsers.commandOptions(req, "points", req.body);
	parsers.commandOptions(req, "lottery", req.body);

	save(req, res, true);
};
