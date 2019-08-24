const fs = require("fs-nextra");
const moment = require("moment");
const { ObjectID } = require("mongodb");
const { AllowedEvents, Scopes } = require("../../../Internals/Constants");
const { saveAdminConsoleOptions: save, renderError, getChannelData, generateCodeID, writeExtensionData, validateExtensionData } = require("../../helpers");
const parsers = require("../../parsers");

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

controllers.public = async (req, { res }) => {
	const { svr } = req;
	const serverDocument = req.svr.document;

	res.setPageData({
		page: "admin-public-data.ejs",
		canUnban: configJSON.maintainers.includes(req.consolemember.user.id) || process.env.GAB_HOST === req.consolemember.user.id,
	});
	res.setConfigData({
		public_data: serverDocument.config.public_data,
		isBanned: configJSON.activityBlocklist.includes(svr.id),
	});
	res.render();
};
controllers.public.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	serverQueryDocument.set("config.public_data.isShown", req.body.isShown === "on");
	let createInvite = false;
	if (!serverDocument.config.public_data.server_listing.isEnabled && req.body["server_listing-isEnabled"] === "on") {
		createInvite = true;
	}
	serverQueryDocument.set("config.public_data.server_listing.isEnabled", req.body["server_listing-isEnabled"] === "on");
	serverQueryDocument.set("config.public_data.server_listing.category", req.body["server_listing-category"]);
	serverQueryDocument.set("config.public_data.server_listing.description", req.body["server_listing-description"]);

	save(req, res, true);
	if (createInvite) {
		req.app.client.IPC.send("createPublicInviteLink", { guild: req.svr.id });
	} else if (!req.body["server_listing-isEnabled"] && serverDocument.config.public_data.server_listing.invite_link) {
		req.app.client.IPC.send("deletePublicInviteLink", { guild: req.svr.id });
	}
};

controllers.extensions = async (req, { res }) => {
	const serverDocument = req.svr.document;
	const serverExtensionDocuments = serverDocument.extensions;

	const extensionData = await Promise.all(serverExtensionDocuments.map(async serverExtensionDocument => {
		const extensionDocument = await Gallery.findOne(new ObjectID(serverExtensionDocument._id));
		if (!extensionDocument) return null;
		const obj = await parsers.extensionData(req, extensionDocument, serverExtensionDocument.version);
		obj.published_version = extensionDocument.published_version;
		obj.latest_version = extensionDocument.version;
		obj.level = extensionDocument.level;
		return obj;
	}));

	extensionData.spliceNullElements();

	res.setPageData({
		page: "admin-extensions.ejs",
		extensionData: extensionData,
	}).setConfigData({
		extensions: serverExtensionDocuments,
	}).setServerData("channelData", getChannelData(req.svr))
		.render();
};

controllers.extensions.post = async (req, { res }) => {
	const { document: serverDocument, queryDocument: serverQueryDocument } = req.svr;

	if (req.body.id && req.body.v) {
		let id;
		try {
			id = new ObjectID(req.body.id);
		} catch (err) {
			return res.sendStatus(404);
		}
		const extensionDocument = await Gallery.findOne(id);
		if (!extensionDocument) return res.sendStatus(404);
		const versionDocument = extensionDocument.versions.id(parseInt(req.body.v));
		if (!versionDocument) return res.sendStatus(404);

		const serverExtensionDocument = { _id: id.toString(), version: parseInt(req.body.v), disabled_channel_ids: [], keywords: [], status: { code: 0, description: "" } };

		switch (versionDocument.type) {
			case "command":
				serverExtensionDocument.key = req.body.key || versionDocument.key;
				serverExtensionDocument.admin_level = parseInt(req.body.adminLevel) || 0;
				Object.values(req.svr.channels).forEach(ch => {
					if (!req.body[`enabled_channel_ids-${ch.id}`] && ch.type === "text") serverExtensionDocument.disabled_channel_ids.push(ch.id);
				});
				break;
			case "keyword":
				serverExtensionDocument.admin_level = parseInt(req.body.adminLevel) || 0;
				Object.values(req.svr.channels).forEach(ch => {
					if (!req.body[`enabled_channel_ids-${ch.id}`] && ch.type === "text") serverExtensionDocument.disabled_channel_ids.push(ch.id);
				});
				serverExtensionDocument.keywords = req.body.keywords ? req.body.keywords.split(",") : versionDocument.keywords;
				serverExtensionDocument.case_sensitive = Boolean(req.body.caseSensitive);
				break;
			case "timer":
				serverExtensionDocument.interval = parseInt(req.body.interval) || versionDocument.interval;
				break;
		}

		try {
			if (serverDocument.extensions.id(id.toString())) serverQueryDocument.clone.id("extensions", id.toString()).set(serverExtensionDocument);
			else serverQueryDocument.push("extensions", serverExtensionDocument);
		} catch (err) {
			logger.debug(`A (malformed) ${req.method} request at ${req.originalURL} resulted in an invalid document.`, {}, err);
			return res.sendStatus(400);
		}
		save(req, res, true);
	} else {
		return res.sendStatus(400);
	}
};

controllers.extensionBuilder = async (req, { res }) => {
	const renderPage = (extensionData, extensionConfigData) => {
		res.setServerData("channelData", getChannelData(req.svr))
			.setPageData({
				page: "admin-extension-builder.ejs",
				extensionData,
				extensionConfigData,
				versionData: extensionData.versions ? extensionData.versions.id(extensionData.version) : {},
				events: AllowedEvents,
				scopes: Scopes,
			})
			.render();
	};

	if (req.query.extid) {
		try {
			const extensionConfigData = req.svr.document.extensions.id(req.query.extid);
			if (extensionConfigData) {
				let galleryDocument;
				try {
					galleryDocument = await Gallery.findOne({
						_id: new ObjectID(req.query.extid),
						level: "third",
					});
				} catch (err) {
					return renderPage({}, {});
				}
				if (galleryDocument) {
					try {
						galleryDocument.code = await fs.readFile(`${__dirname}/../../../extensions/${galleryDocument.versions.id(galleryDocument.version).code_id}.gabext`);
					} catch (err) {
						galleryDocument.code = "";
					}
					renderPage(galleryDocument, extensionConfigData);
				} else {
					renderPage({}, {});
				}
			} else {
				renderPage({}, {});
			}
		} catch (err) {
			renderError(res, "An error occurred while fetching extension data.");
		}
	} else {
		renderPage({}, {});
	}
};
controllers.extensionBuilder.post = async (req, res) => {
	if (validateExtensionData(req.body)) {
		const sendErrorResponse = err => res.status(500).send(err);

		const saveExtensionCode = async (err, codeID) => {
			if (err) {
				logger.warn(`Failed to update settings at ${req.path}`, { usrid: req.user.id }, err);
				sendErrorResponse(err);
			} else {
				try {
					return fs.outputFileAtomic(`${__dirname}/../../../extensions/${codeID}.gabext`, req.body.code);
				} catch (error) {
					logger.warn(`Failed to save extension at ${req.path}`, { usrid: req.user.id }, err);
					sendErrorResponse(true);
				}
			}
		};

		const installExtensionData = async galleryDocument => {
			const serverDocument = req.svr.document;
			const serverQueryDocument = req.svr.queryDocument;
			const versionDocument = galleryDocument.versions.id(galleryDocument.version);

			const serverExtensionDocument = { _id: galleryDocument._id.toString(), version: galleryDocument.version, disabled_channel_ids: [], keywords: [], status: { code: 0, description: "" } };

			switch (versionDocument.type) {
				case "command":
					serverExtensionDocument.key = versionDocument.key;
					serverExtensionDocument.admin_level = parseInt(req.body.adminLevel) || 0;
					Object.values(req.svr.channels).forEach(ch => {
						if (!req.body[`enabled_channel_ids-${ch.id}`] && ch.type === "text") serverExtensionDocument.disabled_channel_ids.push(ch.id);
					});
					break;
				case "keyword":
					serverExtensionDocument.admin_level = parseInt(req.body.adminLevel) || 0;
					Object.values(req.svr.channels).forEach(ch => {
						if (!req.body[`enabled_channel_ids-${ch.id}`] && ch.type === "text") serverExtensionDocument.disabled_channel_ids.push(ch.id);
					});
					serverExtensionDocument.keywords = versionDocument.keywords;
					serverExtensionDocument.case_sensitive = versionDocument.case_sensitive;
					break;
				case "timer":
					serverExtensionDocument.interval = versionDocument.interval;
					break;
			}

			if (serverDocument.extensions.id(galleryDocument._id.toString())) serverQueryDocument.clone.id("extensions", galleryDocument._id.toString()).set(serverExtensionDocument);
			else serverQueryDocument.push("extensions", serverExtensionDocument);
			save(req, res, true);
		};

		const saveExtensionData = async (galleryDocument, isUpdate) => {
			const galleryQueryDocument = galleryDocument.query;

			galleryQueryDocument.set("level", "third")
				.set("description", req.body.description)
				.set("state", "queue");
			writeExtensionData(galleryDocument, req.body);

			if (!isUpdate) galleryQueryDocument.set("owner_id", req.user.id);

			const validation = galleryDocument.validate();
			if (validation) {
				logger.warn("Failed to validate extension data", {}, validation);
				return sendErrorResponse(validation);
			}
			await galleryDocument.save().catch(err => {
				logger.warn(`Failed to save extension metadata.`, {}, err);
				sendErrorResponse(err);
			}).then(async () => {
				await saveExtensionCode(false, generateCodeID(req.body.code));
				await installExtensionData(galleryDocument);
			});
		};

		if (req.query.extid) {
			let galleryDocument;
			try {
				galleryDocument = await Gallery.findOne({
					_id: new ObjectID(req.query.extid),
					owner_id: req.user.id,
				});
			} catch (err) {
				return saveExtensionData(await Gallery.new(), false);
			}
			if (galleryDocument) {
				await saveExtensionData(galleryDocument, true);
			} else {
				await saveExtensionData(await Gallery.new(), false);
			}
		} else {
			await saveExtensionData(await Gallery.new(), false);
		}
	} else {
		renderError(res, "Failed to verify extension data.", undefined, 400);
	}
};

controllers.export = async (req, res) => {
	res.json(req.svr.document.config);
};
