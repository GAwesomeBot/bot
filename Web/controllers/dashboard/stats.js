const { saveAdminConsoleOptions: save, getChannelData, getRoleData } = require("../../helpers");
const parsers = require("../../parsers");

const controllers = module.exports;

controllers.collection = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	res.setPageData({
		page: "admin-stats-collection.ejs",
		channelData: getChannelData(svr),
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
	res.setConfigData({
		commands: {
			messages: serverDocument.config.commands.messages,
			stats: serverDocument.config.commands.stats,
		},
	});
	res.render();
};
controllers.collection.post = async (req, res) => {
	parsers.commandOptions(req, "stats", req.body);
	parsers.commandOptions(req, "games", req.body);
	parsers.commandOptions(req, "messages", req.body);

	save(req, res, true);
};

controllers.ranks = async (req, { res }) => {
	const { svr } = req;
	const serverDocument = req.svr.document;
	await svr.fetchCollection("roles");

	res.setPageData({
		page: "admin-ranks.ejs",
		roleData: getRoleData(svr),
	});
	res.setConfigData({
		ranks_list: serverDocument.config.ranks_list.map(a => {
			a.members = Object.values(serverDocument.members).filter(memberDocument => memberDocument.rank === a._id).length;
			return a;
		}),
	});
	res.render();
};
controllers.ranks.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	if (req.body["new-name"] && req.body["new-max_score"] && !serverDocument.config.ranks_list.id(req.body["new-name"])) {
		serverQueryDocument.push("config.ranks_list", {
			_id: req.body["new-name"],
			max_score: parseInt(req.body["new-max_score"]),
			role_id: req.body["new-role_id"] || null,
		});
	} else if (req.body["ranks_list-reset"]) {
		Object.values(serverDocument.members).forEach(member => {
			serverQueryDocument.set(`members.${member._id}.rank`, "No Rank");
		});
	} else {
		serverDocument.config.ranks_list.forEach(rankDocument => {
			const rankQueryDocument = serverQueryDocument.clone.id("config.ranks_list", rankDocument._id);

			const newMaxScore = parseInt(req.body[`rank-${rankDocument._id}-max_score`]);
			if (newMaxScore || newMaxScore === 0) rankQueryDocument.set("max_score", newMaxScore);

			const newRoleId = req.body[`rank-${rankDocument._id}-role_id`];
			if (newRoleId || newRoleId === "") rankQueryDocument.set("role_id", newRoleId);
		});
	}
	serverQueryDocument.set("config.ranks_list", serverDocument.config.ranks_list.sort((a, b) => a.max_score - b.max_score));

	save(req, res, true);
};

controllers.points = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	res.setPageData({
		page: "admin-gawesome-points.ejs",
		channelData: getChannelData(svr),
		commandDescriptions: {
			points: client.getPublicCommandMetadata("points").description,
			lottery: client.getPublicCommandMetadata("lottery").description,
		},
		commandCategories: {
			points: client.getPublicCommandMetadata("points").category,
			lottery: client.getPublicCommandMetadata("lottery").category,
		},
	});
	res.setConfigData({
		commands: {
			points: serverDocument.config.commands.points,
			lottery: serverDocument.config.commands.lottery,
		},
	});
	res.render();
};
controllers.points.post = async (req, res) => {
	parsers.commandOptions(req, "points", req.body);
	parsers.commandOptions(req, "lottery", req.body);

	save(req, res, true);
};
