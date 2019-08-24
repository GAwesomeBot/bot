const { getChannelData, saveAdminConsoleOptions: save, renderError, findQueryUser } = require("../../helpers");
const parsers = require("../../parsers");

const controllers = module.exports;

controllers.options = async (req, { res }) => {
	await req.svr.fetchCollection("channels");

	res.setConfigData({
		chatterbot: req.svr.document.config.chatterbot,
		command_cooldown: req.svr.document.config.command_cooldown,
		command_fetch_properties: req.svr.document.config.command_fetch_properties,
		command_prefix: req.svr.document.config.command_prefix,
		delete_command_messages: req.svr.document.config.delete_command_messages,
		ban_gif: req.svr.document.config.ban_gif,
	});
	res.setPageData({
		page: "admin-command-options.ejs",
		channelData: getChannelData(req.svr),
		botName: req.svr.members[req.app.client.user.id].nickname || req.app.client.user.username,
	});
	res.render();
};
controllers.options.post = async (req, res) => {
	if (req.body.command_prefix !== req.app.client.getCommandPrefix(req.svr, req.svr.document)) {
		req.svr.queryDocument.set("config.command_prefix", req.body.command_prefix);
	}

	req.svr.queryDocument.set("config.delete_command_messages", req.body.delete_command_messages === "on")
		.set("config.chatterbot.isEnabled", req.body["chatterbot-isEnabled"] === "on")
		.set("config.ban_gif", req.body.ban_gif);

	if (req.body.ban_gif === "Default") req.svr.queryDocument.set("config.ban_gif", "https://imgur.com/3QPLumg.gif");
	if (req.body["chatterbot-isEnabled"] === "on") {
		const channels = getChannelData(req.svr).map(ch => ch.id);
		const enabledChannels = Object.keys(req.body).filter(key => key.startsWith("chatterbot_enabled_channel_ids")).map(chstring => chstring.split("-")[1]);
		channels.forEach(ch => {
			if (!enabledChannels.some(id => ch === id)) {
				req.svr.queryDocument.push("config.chatterbot.disabled_channel_ids", ch);
			} else if (req.svr.document.config.chatterbot.disabled_channel_ids.includes(ch)) {
				req.svr.queryDocument.set("config.chatterbot.disabled_channel_ids", req.svr.document.config.chatterbot.disabled_channel_ids.filter(svrch => ch !== svrch));
			}
		});
	}

	req.svr.queryDocument.set("config.command_cooldown", parseInt(req.body.command_cooldown) > 120000 || isNaN(parseInt(req.body.command_cooldown)) ? 0 : parseInt(req.body.command_cooldown));
	const defaultCount = req.svr.document.config.command_fetch_properties.default_count;
	req.svr.queryDocument.set("config.command_fetch_properties.default_count", isNaN(parseInt(req.body.default_count)) ? defaultCount : parseInt(req.body.default_count))
		.set("config.command_fetch_properties.max_count", isNaN(parseInt(req.body.max_count)) ? req.svr.document.config.command_fetch_properties.max_count : parseInt(req.body.max_count));

	save(req, res, true);
};

controllers.list = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	const commandCategories = {};
	client.getPublicCommandList().forEach(command => {
		const commandData = client.getPublicCommandMetadata(command);
		const data = { description: commandData.description, category: commandData.category, name: command };
		if (!commandCategories[commandData.category]) commandCategories[commandData.category] = [];
		commandCategories[commandData.category].push(data);
	});

	res.setConfigData({
		commands: serverDocument.config.commands,
	});
	res.setPageData({
		page: "admin-command-list.ejs",
		channelData: getChannelData(svr),
		commandCategories,
	});
	res.render();
};
controllers.list.post = async (req, res) => {
	const { document: serverDocument, queryDocument: serverQueryDocument } = req.svr;

	if (req.body["preset-applied"]) {
		const disabled_channel_ids = [];
		req.svr.channels.forEach(ch => {
			if (ch.type === "text") {
				if (!req.body[`preset-disabled_channel_ids-${ch.id}`]) {
					disabled_channel_ids.push(ch.id);
				}
			}
		});
		for (const command in serverDocument.config.commands) {
			if (!serverDocument.config.commands[command]) continue;
			serverQueryDocument.set(`config.commands.${command}.admin_level`, parseInt(req.body["preset-admin_level"]) || 0);
			serverQueryDocument.set(`config.commands.${command}.disabled_channel_ids`, disabled_channel_ids);
		}
	} else {
		for (const command in serverDocument.config.commands) {
			parsers.commandOptions(req, command, req.body);
		}
	}

	save(req, res, true);
};

controllers.rss = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	res.setConfigData({
		rss_feeds: serverDocument.config.rss_feeds,
		commands: {
			rss: serverDocument.config.commands.rss,
			trivia: {
				isEnabled: serverDocument.config.commands.trivia ? serverDocument.config.commands.trivia.isEnabled : null,
			},
		},
	});
	res.setPageData({
		page: "admin-rss-feeds.ejs",
		channelData: getChannelData(svr),
		commandDescriptions: {
			rss: client.getPublicCommandMetadata("rss").description,
		},
		commandCategories: {
			rss: client.getPublicCommandMetadata("rss").category,
		},
	});
	res.render();
};
controllers.rss.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	if (req.body["new-url"] && req.body["new-name"] && !serverDocument.config.rss_feeds.id(req.body["new-name"].replace(/\s/g, ""))) {
		serverQueryDocument.push("config.rss_feeds", {
			_id: req.body["new-name"],
			url: req.body["new-url"],
		});
	} else {
		parsers.commandOptions(req, "rss", req.body);
		serverDocument.config.rss_feeds.forEach((feedDocument, i) => {
			serverQueryDocument.set(`config.rss_feeds.${i}.streaming.isEnabled`, req.body[`rss-${feedDocument._id}-streaming-isEnabled`] === "on");
			serverQueryDocument.set(`config.rss_feeds.${i}.streaming.enabled_channel_ids`, []);
			req.svr.channels.forEach(ch => {
				if (ch.type === "text") {
					if (req.body[`rss-${feedDocument._id}-streaming-enabled_channel_ids-${ch.id}`] === "on") {
						serverQueryDocument.push(`config.rss_feeds.${i}.streaming.enabled_channel_ids`, ch.id);
					}
				}
			});
		});
	}

	save(req, res, true);
};

controllers.streamers = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	res.setConfigData({
		streamers_data: serverDocument.config.streamers_data,
		commands: {
			streamers: serverDocument.config.commands.streamers,
			trivia: {
				isEnabled: serverDocument.config.commands.trivia.isEnabled,
			},
		},
	});
	res.setPageData({
		page: "admin-streamers.ejs",
		channelData: getChannelData(svr),
		commandDescriptions: {
			streamers: client.getPublicCommandMetadata("streamers").description,
		},
		commandCategories: {
			streamers: client.getPublicCommandMetadata("streamers").category,
		},
	});
	res.render();
};
controllers.streamers.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	if (req.body["new-name"] && req.body["new-type"] && !serverDocument.config.streamers_data.id(req.body["new-name"])) {
		serverQueryDocument.push("config.streamers_data", {
			_id: req.body["new-name"],
			type: req.body["new-type"],
		});
	} else {
		parsers.commandOptions(req, "streamers", req.body);
		serverDocument.config.streamers_data.forEach(streamerDocument => {
			const streamerQueryDocument = serverQueryDocument.clone.id("config.streamers_data", streamerDocument._id);
			if (req.body[`streamer-${streamerDocument._id}-channel_id`]) streamerQueryDocument.set("channel_id", req.body[`streamer-${streamerDocument._id}-channel_id`]);
		});
	}

	save(req, res, true);
};

controllers.tags = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	const configData = {
		tags: serverDocument.config.tags,
		commands: {
			tag: serverDocument.config.commands.tag,
			trivia: {
				isEnabled: serverDocument.config.commands.trivia.isEnabled,
			},
		},
	};
	res.setPageData({
		page: "admin-tags.ejs",
		channelData: getChannelData(svr),
		commandDescriptions: {
			tag: client.getPublicCommandMetadata("tag").description,
		},
		commandCategories: {
			tag: client.getPublicCommandMetadata("tag").category,
		},
	});

	const cleanTag = async content => {
		let cleanContent = "";
		while (content.indexOf("<") > -1) {
			cleanContent += content.substring(0, content.indexOf("<"));
			content = content.substring(content.indexOf("<") + 1);
			if (content && content.indexOf(">") > 1) {
				const type = content.charAt(0);
				const id = content.substring(1, content.indexOf(">"));
				if (!isNaN(id)) {
					if (type === "@") {
						const usr = await req.app.client.users.fetch(id);
						if (usr) {
							cleanContent += `<b>@${usr.username}</b>`;
							content = content.substring(content.indexOf(">") + 1);
							continue;
						}
					} else if (type === "#") {
						const ch = svr.channels[id];
						if (ch) {
							cleanContent += `<b>#${ch.name}</b>`;
							content = content.substring(content.indexOf(">") + 1);
							continue;
						}
					}
				}
			}
			cleanContent += "<";
		}
		cleanContent += content;
		return cleanContent;
	};

	for (let i = 0; i < configData.tags.list.length; i++) {
		configData.tags.list[i].content = await cleanTag(configData.tags.list[i].content);
		configData.tags.list[i].index = i;
	}
	configData.tags.list.sort((a, b) => a._id.localeCompare(b._id));

	res.setConfigData(configData);
	res.render();
};
controllers.tags.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	if (req.body["new-name"] && req.body["new-type"] && req.body["new-content"] && !serverDocument.config.tags.list.id(req.body["new-name"])) {
		serverQueryDocument.push("config.tags.list", {
			_id: req.body["new-name"],
			content: req.body["new-content"],
			isCommand: req.body["new-type"] === "command",
		});
	} else {
		parsers.commandOptions(req, "tag", req.body);
		serverQueryDocument.set("config.tags.listIsAdminOnly", req.body.listIsAdminOnly === "true")
			.set("config.tags.addingIsAdminOnly", req.body.addingIsAdminOnly === "true")
			.set("config.tags.addingCommandIsAdminOnly", req.body.addingCommandIsAdminOnly === "true")
			.set("config.tags.removingIsAdminOnly", req.body.removingIsAdminOnly === "true")
			.set("config.tags.removingCommandIsAdminOnly", req.body.removingCommandIsAdminOnly === "true");
		serverDocument.config.tags.list.forEach(tag => {
			serverQueryDocument.clone.id("config.tags.list", tag._id)
				.set("isCommand", req.body[`tag-${tag._id}-isCommand`] === "command")
				.set("isLocked", req.body[`tag-${tag._id}-isLocked`] === "on");
		});
	}

	save(req, res, true);
};

controllers.translation = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	const configData = {
		translated_messages: serverDocument.config.translated_messages,
		commands: {
			trivia: {
				isEnabled: serverDocument.config.commands.trivia.isEnabled,
			},
		},
	};
	res.setPageData({
		page: "admin-auto-translation.ejs",
		channelData: getChannelData(svr),
	});

	await Promise.all(configData.translated_messages.map(async translatedMessage => {
		const usr = await req.app.client.users.fetch(translatedMessage._id);
		translatedMessage.username = usr.username;
		translatedMessage.avatar = client.getAvatarURL(usr.id, usr.avatar) || "/static/img/discord-icon.png";
	}));

	res.setConfigData(configData);
	res.render();
};
controllers.translation.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	if (req.body["new-member"] && req.body["new-source_language"]) {
		const member = await findQueryUser(req.body["new-member"], req.svr);
		if (member && !serverDocument.config.translated_messages.id(member.userID)) {
			const enabled_channel_ids = [];
			req.svr.channels.forEach(ch => {
				if (ch.type === "text") {
					if (req.body[`new-enabled_channel_ids-${ch.id}`] === "true") {
						enabled_channel_ids.push(ch.id);
					}
				}
			});

			serverQueryDocument.push("config.translated_messages", {
				_id: member.userID,
				source_language: req.body["new-source_language"],
				enabled_channel_ids: enabled_channel_ids,
			});
		}
	} else {
		serverDocument.config.translated_messages.forEach(autoTranslateDocument => {
			const autoTranslateQueryDocument = serverQueryDocument.clone.id("config.translated_messages", autoTranslateDocument._id);
			autoTranslateQueryDocument.set("enabled_channel_ids", []);
			req.svr.channels.forEach(ch => {
				if (ch.type === "text") {
					if (req.body[`translated_messages-${autoTranslateDocument._id}-enabled_channel_ids-${ch.id}`] === "on") {
						autoTranslateQueryDocument.push("enabled_channel_ids", ch.id);
					}
				}
			});
		});
	}
	save(req, res, true);
};

controllers.trivia = async (req, { res }) => {
	const serverDocument = req.svr.document;

	if (req.query.i) {
		const triviaSetDocument = serverDocument.config.trivia_sets.id(req.query.i);
		if (triviaSetDocument) {
			res.json(triviaSetDocument.items);
		} else {
			renderError(res, "Are you sure that trivia set exists?", null, 404);
		}
	} else {
		res.setConfigData({
			trivia_sets: serverDocument.config.trivia_sets,
			commands: {
				trivia: {
					isEnabled: serverDocument.config.commands.trivia.isEnabled,
				},
			},
		});
		res.render("pages/admin-trivia-sets.ejs");
	}
};
controllers.trivia.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	if (req.body["new-name"] && req.body["new-items"] && !serverDocument.config.trivia_sets.id(req.body["new-name"])) {
		try {
			serverQueryDocument.push("config.trivia_sets", {
				_id: req.body["new-name"],
				items: JSON.parse(req.body["new-items"]),
			});
		} catch (err) {
			renderError(res, "That doesn't look like a valid trivia set to me!", null, 400);
			return;
		}
	}

	save(req, res, true);
};

controllers.APIKeys = async (req, { res }) => {
	const serverDocument = req.svr.document;

	res.setConfigData("custom_api_keys", serverDocument.config.custom_api_keys || {});
	res.render("pages/admin-api-keys.ejs");
};
controllers.APIKeys.post = async (req, res) => {
	const serverQueryDocument = req.svr.queryDocument;

	serverQueryDocument.set("config.custom_api_keys.google_api_key", req.body.google_api_key);
	serverQueryDocument.set("config.custom_api_keys.google_cse_id", req.body.google_cse_id);
	serverQueryDocument.set("config.custom_api_keys.imgur_client_id", req.body.imgur_client_id);

	save(req, res, true);
};

controllers.reaction = async (req, { res }) => {
	const serverDocument = req.svr.document;

	res.setConfigData("tag_reaction", serverDocument.config.tag_reaction);
	res.render("pages/admin-tag-reaction.ejs");
};
controllers.reaction.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	if (req.body["new-message"] && req.body["new-message"].length <= 2000) {
		serverQueryDocument.push("config.tag_reaction.messages", req.body["new-message"]);
	} else {
		serverQueryDocument.set("config.tag_reaction.isEnabled", req.body.isEnabled === "on");
		serverDocument.config.tag_reaction.messages.forEach((message, i) => {
			if (req.body[`tag_reaction-${i}-removed`]) {
				serverQueryDocument.pull("config.tag_reaction.messages", message);
			}
		});
	}

	save(req, res, true);
};
