const moment = require("moment");
const { saveAdminConsoleOptions: save, parseAuthUser } = require("../../helpers");

const controllers = module.exports;

controllers.nameDisplay = async (req, { res }) => {
	const { client } = req.app;
	const serverDocument = req.svr.document;

	res.setPageData({
		page: "admin-name-display.ejs",
		exampleUsername: req.consolemember.user.username,
		exampleNickname: req.consolemember.nickname,
		exampleDiscriminator: req.consolemember.user.discriminator,
		currentExample: client.getName(serverDocument, req.consolemember),
	});
	res.setConfigData({
		name_display: serverDocument.config.name_display,
	});
	res.render();
};
controllers.nameDisplay.post = async (req, res) => {
	const serverQueryDocument = req.svr.queryDocument;

	serverQueryDocument.set("config.name_display.use_nick", req.body["name_display-use_nick"] === "on")
		.set("config.name_display.show_discriminator", req.body["name_display-show_discriminator"] === "on");

	save(req, res, true);
};

controllers.activities = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	const ongoingTrivia = [];
	const ongoingPolls = [];
	const ongoingGiveaways = [];
	const ongoingLotteries = [];
	const fetchList = [];

	Object.values(serverDocument.channels).forEach(channelDocument => {
		if (channelDocument.poll.isOngoing) fetchList.push(channelDocument.poll.creator_id);
		if (channelDocument.lottery.isOngoing) fetchList.push(channelDocument.lottery.creator_id);
		if (channelDocument.giveaway.isOngoing) fetchList.push(channelDocument.giveaway.creator_id);
	});
	await svr.fetchMember(fetchList);

	Object.values(serverDocument.channels).forEach(channelDocument => {
		const ch = svr.channels.id(channelDocument._id);
		if (ch) {
			if (channelDocument.trivia.isOngoing) {
				ongoingTrivia.push({
					channel: {
						name: ch.name,
						id: ch.id,
					},
					set: channelDocument.trivia.set_id,
					score: channelDocument.trivia.score,
					max_score: channelDocument.trivia.past_questions.length - 1,
					responders: channelDocument.trivia.responders.length,
				});
			}
			if (channelDocument.poll.isOngoing) {
				const creator = svr.members[channelDocument.poll.creator_id] || { user: { username: "invalid-user" } };
				ongoingPolls.push({
					title: channelDocument.poll.title,
					channel: {
						name: ch.name,
						id: ch.id,
					},
					rawCreated: moment(channelDocument.poll.created_timestamp).format(configJS.moment_date_format),
					relativeCreated: moment(channelDocument.poll.created_timestamp).fromNow(),
					creator: creator.user.username,
					options: channelDocument.poll.options.length,
					responses: channelDocument.poll.responses.length,
				});
			}
			if (channelDocument.giveaway.isOngoing) {
				const creator = svr.members[channelDocument.giveaway.creator_id] || { user: { username: "invalid-user" } };
				ongoingGiveaways.push({
					title: channelDocument.giveaway.title,
					channel: {
						name: ch.name,
						id: ch.id,
					},
					creator: creator.user.username,
					rawExpiry: moment(channelDocument.giveaway.expiry_timestamp).format(configJS.moment_date_format),
					relativeExpiry: Math.ceil((channelDocument.giveaway.expiry_timestamp - Date.now()) / 3600000),
					participants: channelDocument.giveaway.participant_ids.length,
				});
			}
			if (channelDocument.lottery.isOngoing) {
				const creator = svr.members[channelDocument.lottery.creator_id] || { user: { username: "invalid-user" } };
				ongoingLotteries.push({
					channel: {
						name: ch.name,
						id: ch.id,
					},
					tickets: channelDocument.lottery.participant_ids.length,
					creator: creator.user.username,
				});
			}
		}
	});

	let defaultChannel;

	const generalChannel = svr.channels.find(ch => (ch.name === "general" || ch.name === "mainchat") && ch.type === "text");

	if (generalChannel) {
		defaultChannel = generalChannel;
	} else {
		[defaultChannel] = svr.channels.filter(c => c.type === "text")
			.sort((a, b) => a.rawPosition - b.rawPosition);
	}

	res.setPageData({
		page: "admin-ongoing-activities.ejs",
		trivia: ongoingTrivia,
		polls: ongoingPolls,
		giveaways: ongoingGiveaways,
		lotteries: ongoingLotteries,
		commandPrefix: client.getCommandPrefix(svr, serverDocument),
	});
	res.setServerData("defaultChannel", defaultChannel.name);
	res.render();
};
controllers.activities.post = async (req, res) => {
	if (req.body["end-type"] && req.body["end-id"]) {
		switch (req.body["end-type"]) {
			case "trivia":
				req.app.client.IPC.send("modifyActivity", { action: "end", activity: "trivia", guild: req.svr.id, channel: req.body["end-id"] });
				break;
			case "poll":
				req.app.client.IPC.send("modifyActivity", { action: "end", activity: "poll", guild: req.svr.id, channel: req.body["end-id"] });
				break;
			case "giveaway":
				req.app.client.IPC.send("modifyActivity", { action: "end", activity: "giveaway", guild: req.svr.id, channel: req.body["end-id"] });
				break;
			case "lottery":
				req.app.client.IPC.send("modifyActivity", { action: "end", activity: "lottery", guild: req.svr.id, channel: req.body["end-id"] });
				break;
		}
		res.sendStatus(200);
	} else {
		res.sendStatus(400);
	}
};

controllers.public = async (req, res) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	res.render("pages/admin-public-data.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons"),
		},
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			public_data: serverDocument.config.public_data,
			isBanned: configJSON.activityBlocklist.includes(svr.id),
			canUnban: configJSON.maintainers.includes(req.consolemember.user.id) || process.env.GAB_HOST === req.consolemember.user.id,
		},
	});
};
controllers.public.post = async (req, res) => {
	const serverDocument = req.svr.document;

	serverDocument.config.public_data.isShown = req.body.isShown === "on";
	let createInvite = false;
	if (!serverDocument.config.public_data.server_listing.isEnabled && req.body["server_listing-isEnabled"] === "on") {
		createInvite = true;
	}
	serverDocument.config.public_data.server_listing.isEnabled = req.body["server_listing-isEnabled"] === "on";
	serverDocument.config.public_data.server_listing.category = req.body["server_listing-category"];
	serverDocument.config.public_data.server_listing.description = req.body["server_listing-description"];
	if (createInvite) {
		save(req, res, true);
		req.app.client.IPC.send("createPublicInviteLink", { guild: req.svr.id });
	} else if (!req.body["server_listing-isEnabled"] && serverDocument.config.public_data.server_listing.invite_link) {
		save(req, res, true);
		req.app.client.IPC.send("deletePublicInviteLink", { guild: req.svr.id });
	} else {
		save(req, res, true);
	}
};

controllers.extensions = async (req, res) => {
	res.render("pages/503.ejs", {});
};

controllers.export = async (req, res) => {
	res.json(req.svr.document.toObject().config);
};
