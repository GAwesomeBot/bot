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

controllers.list = async (req, res) => {
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
	res.render("pages/admin-command-list.ejs", {
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
			commands: serverDocument.toObject().config.commands,
		},
		commandCategories,
	});
};
controllers.list.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["preset-applied"]) {
		const disabled_channel_ids = [];
		req.svr.channels.forEach(ch => {
			if (ch.type === "text") {
				if (!req.body[`preset-disabled_channel_ids-${ch.id}`]) {
					disabled_channel_ids.push(ch.id);
				}
			}
		});
		for (const command in serverDocument.toObject().config.commands) {
			if (!serverDocument.config.commands[command]) continue;
			serverDocument.config.commands[command].admin_level = req.body["preset-admin_level"] || 0;
			serverDocument.config.commands[command].disabled_channel_ids = disabled_channel_ids;
		}
	} else {
		for (const command in serverDocument.toObject().config.commands) {
			parsers.commandOptions(req, command, req.body);
		}
	}

	save(req, res, true);
};

controllers.rss = async (req, res) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	res.render("pages/admin-rss-feeds.ejs", {
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
			rss_feeds: serverDocument.config.rss_feeds,
			commands: {
				rss: serverDocument.config.commands.rss,
				trivia: {
					isEnabled: serverDocument.config.commands.trivia ? serverDocument.config.commands.trivia.isEnabled : null,
				},
			},
		},
		commandDescriptions: {
			rss: client.getPublicCommandMetadata("rss").description,
		},
		commandCategories: {
			rss: client.getPublicCommandMetadata("rss").category,
		},
	});
};
controllers.rss.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-url"] && req.body["new-name"] && !serverDocument.config.rss_feeds.id(req.body["new-name"].replace(/\s/g, ""))) {
		serverDocument.config.rss_feeds.push({
			_id: req.body["new-name"],
			url: req.body["new-url"],
		});
	} else {
		parsers.commandOptions(req, "rss", req.body);
		for (let i = 0; i < serverDocument.config.rss_feeds.length; i++) {
			serverDocument.config.rss_feeds[i].streaming.isEnabled = req.body[`rss-${serverDocument.config.rss_feeds[i]._id}-streaming-isEnabled`] === "on";
			serverDocument.config.rss_feeds[i].streaming.enabled_channel_ids = [];
			req.svr.channels.forEach(ch => {
				if (ch.type === "text") {
					if (req.body[`rss-${serverDocument.config.rss_feeds[i]._id}-streaming-enabled_channel_ids-${ch.id}`] === "on") {
						serverDocument.config.rss_feeds[i].streaming.enabled_channel_ids.push(ch.id);
					}
				}
			});
		}
	}

	save(req, res, true);
};

controllers.streamers = async (req, res) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	res.render("pages/admin-streamers.ejs", {
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
			streamers_data: serverDocument.config.streamers_data,
			commands: {
				streamers: serverDocument.config.commands.streamers,
				trivia: {
					isEnabled: serverDocument.config.commands.trivia.isEnabled,
				},
			},
		},
		commandDescriptions: {
			streamers: client.getPublicCommandMetadata("streamers").description,
		},
		commandCategories: {
			streamers: client.getPublicCommandMetadata("streamers").category,
		},
	});
};
controllers.streamers.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-name"] && req.body["new-type"] && !serverDocument.config.streamers_data.id(req.body["new-name"])) {
		serverDocument.config.streamers_data.push({
			_id: req.body["new-name"],
			type: req.body["new-type"],
		});
	} else {
		parsers.commandOptions(req, "streamers", req.body);
		for (let i = 0; i < serverDocument.config.streamers_data.length; i++) {
			serverDocument.config.streamers_data[i].channel_id = req.body[`streamer-${serverDocument.config.streamers_data[i]._id}-channel_id`];
		}
	}

	save(req, res, true);
};

controllers.tags = async (req, res) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	const data = {
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
			tags: serverDocument.config.tags,
			commands: {
				tag: serverDocument.config.commands.tag,
				trivia: {
					isEnabled: serverDocument.config.commands.trivia.isEnabled,
				},
			},
		},
		commandDescriptions: {
			tag: client.getPublicCommandMetadata("tag").description,
		},
		commandCategories: {
			tag: client.getPublicCommandMetadata("tag").category,
		},
	};

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

	for (let i = 0; i < data.configData.tags.list.length; i++) {
		data.configData.tags.list[i].content = await cleanTag(data.configData.tags.list[i].content);
		data.configData.tags.list[i].index = i;
	}
	data.configData.tags.list.sort((a, b) => a._id.localeCompare(b._id));
	res.render("pages/admin-tags.ejs", data);
};
controllers.tags.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-name"] && req.body["new-type"] && req.body["new-content"] && !serverDocument.config.tags.list.id(req.body["new-name"])) {
		serverDocument.config.tags.list.push({
			_id: req.body["new-name"],
			content: req.body["new-content"],
			isCommand: req.body["new-type"] === "command",
		});
	} else {
		parsers.commandOptions(req, "tag", req.body);
		serverDocument.config.tags.listIsAdminOnly = req.body.listIsAdminOnly === "true";
		serverDocument.config.tags.addingIsAdminOnly = req.body.addingIsAdminOnly === "true";
		serverDocument.config.tags.addingCommandIsAdminOnly = req.body.addingCommandIsAdminOnly === "true";
		serverDocument.config.tags.removingIsAdminOnly = req.body.removingIsAdminOnly === "true";
		serverDocument.config.tags.removingCommandIsAdminOnly = req.body.removingCommandIsAdminOnly === "true";
		serverDocument.config.tags.list.forEach(tag => {
			tag.isCommand = req.body[`tag-${tag._id}-isCommand`] === "command";
			tag.isLocked = req.body[`tag-${tag._id}-isLocked`] === "on";
		});
	}

	save(req, res, true);
};

controllers.translation = async (req, res) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	const data = {
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
			translated_messages: serverDocument.config.translated_messages,
			commands: {
				trivia: {
					isEnabled: serverDocument.config.commands.trivia.isEnabled,
				},
			},
		},
	};
	for (let i = 0; i < data.configData.translated_messages.length; i++) {
		const usr = await req.app.client.users.fetch(data.configData.translated_messages[i]._id);
		data.configData.translated_messages[i].username = usr.username;
		data.configData.translated_messages[i].avatar = client.getAvatarURL(usr.id, usr.avatar) || "/static/img/discord-icon.png";
	}
	res.render("pages/admin-auto-translation.ejs", data);
};
controllers.translation.post = async (req, res) => {
	const serverDocument = req.svr.document;

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

			serverDocument.config.translated_messages.push({
				_id: member.userID,
				source_language: req.body["new-source_language"],
				enabled_channel_ids: enabled_channel_ids,
			});
		}
	} else {
		serverDocument.config.translated_messages.forEach(autoTranslateDocument => {
			autoTranslateDocument.enabled_channel_ids = [];
			req.svr.channels.forEach(ch => {
				if (ch.type === "text") {
					if (req.body[`translated_messages-${autoTranslateDocument._id}-enabled_channel_ids-${ch.id}`] === "on") {
						autoTranslateDocument.enabled_channel_ids.push(ch.id);
					}
				}
			});
		});
	}
	save(req, res, true);
};

controllers.trivia = async (req, res) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	if (req.query.i) {
		const triviaSetDocument = serverDocument.config.trivia_sets.id(req.query.i);
		if (triviaSetDocument) {
			res.json(triviaSetDocument.items);
		} else {
			renderError(res, "Are you sure that trivia set exists?", null, 404);
		}
	} else {
		res.render("pages/admin-trivia-sets.ejs", {
			authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
			sudo: req.isSudo,
			serverData: {
				name: svr.name,
				id: svr.id,
				icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
			},
			currentPage: `${req.baseUrl}${req.path}`,
			configData: {
				trivia_sets: serverDocument.config.trivia_sets,
				commands: {
					trivia: {
						isEnabled: serverDocument.config.commands.trivia.isEnabled,
					},
				},
			},
		});
	}
};
controllers.trivia.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-name"] && req.body["new-items"] && !serverDocument.config.trivia_sets.id(req.body["new-name"])) {
		try {
			serverDocument.config.trivia_sets.push({
				_id: req.body["new-name"],
				items: JSON.parse(req.body["new-items"]),
			});
		} catch (err) {
			renderError(res, "That doesn't look like valid JSON to me!", null, 400);
			return;
		}
	}

	save(req, res, true);
};

controllers.APIKeys = async (req, res) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	res.render("pages/admin-api-keys.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
		},
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			custom_api_keys: serverDocument.config.custom_api_keys || {},
		},
	});
};
controllers.APIKeys.post = async (req, res) => {
	const serverDocument = req.svr.document;

	serverDocument.config.custom_api_keys.google_api_key = req.body.google_api_key;
	serverDocument.config.custom_api_keys.google_cse_id = req.body.google_cse_id;

	save(req, res, true);
};

controllers.reaction = async (req, res) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	res.render("pages/admin-tag-reaction.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
		},
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			tag_reaction: serverDocument.config.tag_reaction,
		},
	});
};
controllers.reaction.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-message"] && req.body["new-message"].length <= 2000) {
		serverDocument.config.tag_reaction.messages.push(req.body["new-message"]);
	} else {
		serverDocument.config.tag_reaction.isEnabled = req.body.isEnabled === "on";
		for (let i = 0; i < serverDocument.config.tag_reaction.messages.length; i++) {
			if (req.body[`tag_reaction-${i}-removed`]) {
				serverDocument.config.tag_reaction.messages[i] = null;
			}
		}
		serverDocument.config.tag_reaction.messages.spliceNullElements();
	}

	save(req, res, true);
};
