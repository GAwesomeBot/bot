const moment = require("moment");
const xssFilters = require("xss-filters");
const showdown = require("showdown");
const md = new showdown.Converter({
	tables: true,
	simplifiedAutoLink: true,
	strikethrough: true,
	tasklists: true,
	smoothLivePreview: true,
	smartIndentationFix: true,
});
md.setFlavor("github");

const { GetGuild } = require("../../Modules").getGuild;
const { parseAuthUser, canDo, getChannelData, getRoleData, saveAdminConsoleOptions: save, findQueryUser, renderError, createMessageOfTheDay } = require("../helpers");
const parsers = require("../parsers");

const controllers = module.exports;

controllers.home = async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect("/login");
	} else {
		const serverData = [];
		const usr = await req.app.client.users.fetch(req.user.id, true);
		const addServerData = async (i, callback) => {
			if (req.user.guilds && i < req.user.guilds.length) {
				if (!usr) return addServerData(++i, callback);
				const svr = new GetGuild(req.app.client, req.user.guilds[i].id);
				await svr.initialize(usr.id);
				if (!svr.success && !((parseInt(req.user.guilds[i].permissions) >> 5) & 1)) {
					addServerData(++i, callback);
					return;
				}
				const data = {
					name: req.user.guilds[i].name,
					id: req.user.guilds[i].id,
					icon: req.user.guilds[i].icon ? `https://cdn.discordapp.com/icons/${req.user.guilds[i].id}/${req.user.guilds[i].icon}.jpg` : "/static/img/discord-icon.png",
					botJoined: svr.success,
					isAdmin: false,
				};
				if (svr.success) {
					const serverDocument = await Servers.findOne({ _id: req.user.guilds[i].id }).exec();
					if (serverDocument) {
						const member = svr.members[usr.id];
						if (req.app.client.getUserBotAdmin(svr, serverDocument, member) >= 3 || canDo("sudo", usr.id)) {
							data.isAdmin = true;
						}
					}
					serverData.push(data);
					addServerData(++i, callback);
				} else {
					serverData.push(data);
					addServerData(++i, callback);
				}
			} else {
				return callback();
			}
		};
		addServerData(0, () => {
			serverData.sort((a, b) => a.name.localeCompare(b.name));
			if (configJSON.maintainers.includes(req.user.id)) {
				serverData.push({
					name: "Maintainer Console",
					id: "maintainer",
					icon: "/static/img/transparent.png",
					botJoined: true,
					isAdmin: true,
				});
			}
			res.render("pages/dashboard.ejs", {
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				serverData,
				rawJoinLink: `https://discordapp.com/oauth2/authorize?&client_id=${req.app.auth.discord.clientID}&scope=bot&permissions=470019135`,
			});
		});
	}
};

controllers.overview = async (req, res) => {
	// Redirect to maintainer console if necessary
	if (!req.svr && req.isAuthorized) {
		res.redirect("/dashboard/maintainer/maintainer");
	} else {
		let topCommand;
		let topCommandUsage = 0;
		for (const cmd in req.svr.document.command_usage) {
			if (req.svr.document.command_usage[cmd] > topCommandUsage) {
				topCommand = cmd;
				topCommandUsage = req.svr.document.command_usage[cmd];
			}
		}

		const topMemberID = req.svr.document.members.sort((a, b) => b.messages - a.messages)[0];
		let topMember = topMemberID ? topMemberID._id : null;
		const memberIDs = Object.keys(req.svr.members);

		const userDocuments = await Users.find({
			_id: {
				$in: memberIDs,
			},
		}).sort({
			points: -1,
		}).limit(1)
			.exec();

		let richestMember;
		if (userDocuments && userDocuments.length > 0) {
			richestMember = userDocuments[0]._id;
		}
		await req.svr.fetchMember([richestMember ? richestMember : undefined, topMember ? topMember : undefined]);
		richestMember = req.svr.members[richestMember];
		topMember = req.svr.members[topMember];
		const topGame = req.svr.document.games.sort((a, b) => b.time_played - a.time_played)[0];
		res.render("pages/admin-overview.ejs", {
			authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
			sudo: req.isSudo,
			serverData: {
				name: req.svr.name,
				id: req.svr.id,
				icon: req.app.client.getAvatarURL(req.svr.id, req.svr.icon, "icons") || "/static/img/discord-icon.png",
				owner: {
					username: req.svr.members[req.svr.ownerID].user.username,
					id: req.svr.members[req.svr.ownerID].user.id,
					avatar: req.app.client.getAvatarURL(req.svr.members[req.svr.ownerID].user.id, req.svr.members[req.svr.ownerID].user.avatar) || "/static/img/discord-icon.png",
				},
			},
			currentPage: `${req.baseUrl}${req.path}`,
			messagesToday: req.svr.document.messages_today,
			topCommand,
			memberCount: req.svr.memberCount,
			topMember: topMember ? {
				username: topMember.user.username,
				id: topMember.user.id,
				avatar: req.app.client.getAvatarURL(topMember.user.id, topMember.user.avatar) || "/static/img/discord-icon.png",
			} : null,
			topGame: topGame ? topGame._id : null,
			richestMember: richestMember ? {
				username: richestMember.user.username,
				id: richestMember.user.id,
				avatar: req.app.client.getAvatarURL(richestMember.user.id, richestMember.user.avatar) || "/static/img/discord-icon.png",
			} : null,
		});
	}
};

controllers.commands = {};

controllers.commands.options = async (req, res) => {
	await req.svr.fetchCollection("channels");
	res.render("pages/admin-command-options.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: req.svr.name,
			id: req.svr.id,
			icon: req.app.client.getAvatarURL(req.svr.id, req.svr.icon, "icons") || "/static/img/discord-icon.png",
		},
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			chatterbot: req.svr.document.config.chatterbot,
			command_cooldown: req.svr.document.config.command_cooldown,
			command_fetch_properties: req.svr.document.config.command_fetch_properties,
			command_prefix: req.svr.document.config.command_prefix,
			delete_command_messages: req.svr.document.config.delete_command_messages,
			ban_gif: req.svr.document.config.ban_gif,
		},
		channelData: getChannelData(req.svr),
		botName: req.svr.members[req.app.client.user.id].nickname || req.app.client.user.username,
	});
};
controllers.commands.options.post = async (req, res) => {
	if (req.body.command_prefix !== req.app.client.getCommandPrefix(req.svr, req.svr.document)) {
		req.svr.document.config.command_prefix = req.body.command_prefix;
	}

	req.svr.document.config.delete_command_messages = req.body.delete_command_messages === "on";
	req.svr.document.config.chatterbot.isEnabled = req.body["chatterbot-isEnabled"] === "on";
	req.svr.document.config.ban_gif = req.body.ban_gif;

	if (req.body.ban_gif === "Default") req.svr.document.config.ban_gif = "https://imgur.com/3QPLumg.gif";
	if (req.body["chatterbot-isEnabled"] === "on") {
		const channels = getChannelData(req.svr).map(ch => ch.id);
		const enabledChannels = Object.keys(req.body).filter(key => key.startsWith("chatterbot_enabled_channel_ids")).map(chstring => chstring.split("-")[1]);
		channels.forEach(ch => {
			if (!enabledChannels.some(id => ch === id)) {
				req.svr.document.config.chatterbot.disabled_channel_ids.push(ch);
			} else if (req.svr.document.config.chatterbot.disabled_channel_ids.indexOf(ch) > -1) {
				req.svr.document.config.chatterbot.disabled_channel_ids = req.svr.document.config.chatterbot.disabled_channel_ids.filter(svrch => ch !== svrch);
			}
		});
	}

	req.svr.document.config.command_cooldown = parseInt(req.body.command_cooldown) > 120000 || isNaN(parseInt(req.body.command_cooldown)) ? 0 : parseInt(req.body.command_cooldown);
	const defaultCount = req.svr.document.config.command_fetch_properties.default_count;
	req.svr.document.config.command_fetch_properties.default_count = isNaN(parseInt(req.body.default_count)) ? defaultCount : parseInt(req.body.default_count);
	req.svr.document.config.command_fetch_properties.max_count = isNaN(parseInt(req.body.max_count)) ? req.svr.document.config.command_fetch_properties.max_count : parseInt(req.body.max_count);

	save(req, res, true);
};

controllers.commands.list = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	const commandDescriptions = {};
	const commandCategories = {};
	client.getPublicCommandList().forEach(command => {
		const commandData = client.getPublicCommandMetadata(command);
		commandDescriptions[command] = commandData.description;
		commandCategories[command] = commandData.category;
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
		commandDescriptions,
		commandCategories,
	});
};
controllers.commands.list.post = async (req, res) => {
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

controllers.commands.rss = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
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
controllers.commands.rss.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-url"] && req.body["new-name"] && !serverDocument.config.rss_feeds.id(req.body["new-name"])) {
		serverDocument.config.rss_feeds.push({
			_id: req.body["new-name"],
			url: req.body["new-url"],
		});
	} else {
		parsers.commandOptions(req, "rss", req.body);
		for (let i = 0; i < serverDocument.config.rss_feeds.length; i++) {
			if (req.body[`rss-${serverDocument.config.rss_feeds[i]._id}-removed`]) {
				serverDocument.config.rss_feeds[i] = null;
			} else {
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
		serverDocument.config.rss_feeds.spliceNullElements();
	}

	save(req, res, true);
};

controllers.commands.streamers = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
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
controllers.commands.streamers.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-name"] && req.body["new-type"] && !serverDocument.config.streamers_data.id(req.body["new-name"])) {
		serverDocument.config.streamers_data.push({
			_id: req.body["new-name"],
			type: req.body["new-type"],
		});
	} else {
		parsers.commandOptions(req, "streamers", req.body);
		for (let i = 0; i < serverDocument.config.streamers_data.length; i++) {
			if (req.body[`streamer-${serverDocument.config.streamers_data[i]._id}-removed`]) {
				serverDocument.config.streamers_data[i] = null;
			} else {
				serverDocument.config.streamers_data[i].channel_id = req.body[`streamer-${serverDocument.config.streamers_data[i]._id}-channel_id`];
			}
		}
		serverDocument.config.streamers_data.spliceNullElements();
	}

	save(req, res, true);
};

controllers.commands.tags = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
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
controllers.commands.tags.post = async (req, res) => {
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
		for (let i = 0; i < serverDocument.config.tags.list.length; i++) {
			if (req.body[`tag-${i}-removed`]) {
				serverDocument.config.tags.list[i] = null;
			} else {
				serverDocument.config.tags.list[i].isCommand = req.body[`tag-${i}-isCommand`] === "command";
				serverDocument.config.tags.list[i].isLocked = req.body[`tag-${i}-isLocked`] === "on";
			}
		}
		serverDocument.config.tags.list.spliceNullElements();
	}

	save(req, res, true);
};

controllers.commands.translation = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
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
controllers.commands.translation.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-member"] && req.body["new-source_language"]) {
		const member = await findQueryUser(req.body["new-member"], req.svr);
		if (member && !serverDocument.config.translated_messages.id(member.id)) {
			const enabled_channel_ids = [];
			req.svr.channels.forEach(ch => {
				if (ch.type === "text") {
					if (req.body[`new-enabled_channel_ids-${ch.id}`] === "true") {
						enabled_channel_ids.push(ch.id);
					}
				}
			});
			serverDocument.config.translated_messages.push({
				_id: member.id,
				source_language: req.body["new-source_language"],
				enabled_channel_ids: enabled_channel_ids,
			});
		}
	} else {
		for (let i = 0; i < serverDocument.config.translated_messages.length; i++) {
			if (req.body[`translated_messages-${i}-removed`]) {
				serverDocument.config.translated_messages[i] = null;
			} else {
				serverDocument.config.translated_messages[i].enabled_channel_ids = [];
				req.svr.channels.forEach(ch => {
					if (ch.type === "text") {
						if (req.body[`translated_messages-${i}-enabled_channel_ids-${ch.id}`] === "on") {
							serverDocument.config.translated_messages[i].enabled_channel_ids.push(ch.id);
						}
					}
				});
			}
		}
		serverDocument.config.translated_messages.spliceNullElements();
	}
	save(req, res, true);
};

controllers.commands.trivia = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	if (req.query.i) {
		const triviaSetDocument = serverDocument.config.trivia_sets[req.query.i];
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
controllers.commands.trivia.post = async (req, res) => {
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
	} else {
		for (let i = 0; i < serverDocument.config.trivia_sets.length; i++) {
			if (req.body[`trivia_set-${i}-removed`]) {
				serverDocument.config.trivia_sets[i] = null;
			}
		}
		serverDocument.config.trivia_sets.spliceNullElements();
	}

	save(req, res, true);
};

controllers.commands.APIKeys = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
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
controllers.commands.APIKeys.post = async (req, res) => {
	const serverDocument = req.svr.document;

	serverDocument.config.custom_api_keys.google_api_key = req.body.google_api_key;
	serverDocument.config.custom_api_keys.google_cse_id = req.body.google_cse_id;

	save(req, res, true);
};

controllers.commands.reaction = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
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
controllers.commands.reaction.post = async (req, res) => {
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

controllers.stats = {};

controllers.stats.collection = async (req, res) => {
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
				games: serverDocument.config.commands.games,
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
controllers.stats.collection.post = async (req, res) => {
	parsers.commandOptions(req, "stats", req.body);
	parsers.commandOptions(req, "games", req.body);
	parsers.commandOptions(req, "messages", req.body);

	save(req, res, true);
};

controllers.stats.ranks = async (req, res) => {
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
controllers.stats.ranks.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-name"] && req.body["new-max_score"] && !serverDocument.config.ranks_list.id(req.body["new-name"])) {
		serverDocument.config.ranks_list.push({
			_id: req.body["new-name"],
			max_score: req.body["new-max_score"],
			role_id: req.body["new-role_id"] || null,
		});
	} else {
		for (let i = 0; i < serverDocument.config.ranks_list.length; i++) {
			if (req.body[`rank-${i}-removed`]) {
				serverDocument.config.ranks_list[i] = null;
			} else {
				serverDocument.config.ranks_list[i].max_score = parseInt(req.body[`rank-${i}-max_score`]);
				if (serverDocument.config.ranks_list[i].role_id || req.body[`rank-${i}-role_id`]) {
					serverDocument.config.ranks_list[i].role_id = req.body[`rank-${i}-role_id`];
				}
			}
		}
		if (req.body["ranks_list-reset"]) {
			for (let i = 0; i < serverDocument.members.length; i++) {
				if (serverDocument.members[i].rank && serverDocument.members[i].rank !== serverDocument.config.ranks_list[0]._id) {
					serverDocument.members[i].rank = serverDocument.config.ranks_list[0]._id;
				}
			}
		}
	}
	serverDocument.config.ranks_list.spliceNullElements();
	serverDocument.config.ranks_list = serverDocument.config.ranks_list.sort((a, b) => a.max_score - b.max_score);

	save(req, res, true);
};

controllers.stats.points = async (req, res) => {
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
controllers.stats.points.post = async (req, res) => {
	parsers.commandOptions(req, "points", req.body);
	parsers.commandOptions(req, "lottery", req.body);

	save(req, res, true);
};

controllers.administration = {};

controllers.administration.admins = async (req, res) => {
	const adminDocuments = req.svr.document.config.admins.filter(adminDocument => req.svr.roles.includes(adminDocument._id));
	await req.svr.fetchCollection("roles");
	res.render("pages/admin-admins.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: req.svr.name,
			id: req.svr.id,
			icon: req.app.client.getAvatarURL(req.svr.id, req.svr.icon, "icons") || "/static/img/discord-icon.png",
		},
		channelData: getChannelData(req.svr),
		roleData: getRoleData(req.svr).filter(role => req.svr.document.config.admins.id(role.id) === null),
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			admins: adminDocuments.map(adminDocument => {
				adminDocument.name = req.svr.roles.find(role => role.id === adminDocument._id).name;
				return adminDocument;
			}),
			auto_add_admins: req.svr.document.config.auto_add_admins,
		},
	});
};
controllers.administration.admins.post = (req, res) => {
	if (req.body["new-role_id"] && req.body["new-level"] && !req.svr.document.config.admins.id(req.body["new-role_id"])) {
		let level = parseInt(req.body["new-level"]);
		if (isNaN(level) || level > 3 || level < 1) level = 1;
		req.svr.document.config.admins.push({
			_id: req.body["new-role_id"],
			level: level,
		});
	} else {
		req.svr.document.config.admins.forEach(admin => {
			if (req.body[`admin-${admin._id}-removed`]) {
				req.svr.document.config.admins.pull(admin);
			}
		});
		req.svr.document.config.admins.spliceNullElements();
	}

	save(req, res);
};

controllers.administration.moderation = async (req, res) => {
	const client = req.app.client;
	const svr = await req.svr.fetchCollection("roles");
	const serverDocument = req.svr.document;

	res.render("pages/admin-moderation.ejs", {
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
			moderation: {
				isEnabled: serverDocument.config.moderation.isEnabled,
				autokick_members: serverDocument.config.moderation.autokick_members,
				new_member_roles: serverDocument.config.moderation.new_member_roles,
			},
			modlog: {
				isEnabled: serverDocument.modlog.isEnabled,
				channel_id: serverDocument.modlog.channel_id,
			},
		},
	});
};
controllers.administration.moderation.post = async (req, res) => {
	const serverDocument = req.svr.document;
	await req.svr.fetchCollection("roles");

	serverDocument.config.moderation.isEnabled = req.body.isEnabled === "on";
	serverDocument.config.moderation.autokick_members.isEnabled = req.body["autokick_members-isEnabled"] === "on";
	serverDocument.config.moderation.autokick_members.max_inactivity = parseInt(req.body["autokick_members-max_inactivity"]);
	serverDocument.config.moderation.new_member_roles = [];
	req.svr.roles.forEach(role => {
		if (role.name !== "@everyone" && role.name.indexOf("color-") !== 0) {
			if (req.body[`new_member_roles-${role.id}`] === "on") {
				serverDocument.config.moderation.new_member_roles.push(role.id);
			}
		}
	});
	serverDocument.modlog.isEnabled = req.body["modlog-isEnabled"] === "on";
	serverDocument.modlog.channel_id = req.body["modlog-channel_id"];

	save(req, res, true);
};

controllers.administration.blocked = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	const blockedMembers = svr.memberList.filter(member => serverDocument.config.blocked.includes(member))
		.concat(configJSON.userBlocklist.filter(usrid => svr.memberList.includes(usrid)));
	await svr.fetchMember(blockedMembers);

	res.render("pages/admin-blocked.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
		},
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			blocked: blockedMembers.map(ID => {
				const member = svr.members[ID];
				return	{
					name: member.user.username,
					id: member.user.id,
					avatar: client.getAvatarURL(member.user.id, member.user.avatar) || "/static/img/discord-icon.png",
					isGlobal: !!configJSON.userBlocklist.includes(member.user.id),
				};
			}),
			moderation: {
				isEnabled: serverDocument.config.moderation.isEnabled,
			},
		},
	});
};
controllers.administration.blocked.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-member"]) {
		const member = await findQueryUser(req.body["new-member"], req.svr);
		if (member && !serverDocument.config.blocked.includes(member.user.id) && req.app.client.getUserBotAdmin(req.svr, serverDocument, member) === 0) {
			serverDocument.config.blocked.push(member.user.id);
		}
	} else {
		for (let i = 0; i < serverDocument.config.blocked.length; i++) {
			if (req.body[`block-${i}-removed`] !== undefined) {
				serverDocument.config.blocked[i] = null;
			}
		}
		serverDocument.config.blocked.spliceNullElements();
	}
	save(req, res);
};

controllers.administration.muted = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	const mutedMemberList = serverDocument.members.filter(memberDocument => memberDocument.muted && memberDocument.muted.length > 0 && svr.memberList.includes(memberDocument._id));
	await svr.fetchMember(mutedMemberList.map(memberDocument => memberDocument._id));

	const mutedMembers = mutedMemberList.map(memberDocument => {
		const member = svr.members[memberDocument._id];
		return {
			name: member.user.username,
			id: member.user.id,
			avatar: client.getAvatarURL(member.user.id, member.user.avatar),
			channels: memberDocument.muted.map(memberMutedDocument => memberMutedDocument._id),
		};
	});
	mutedMembers.sort((a, b) => a.name.localeCompare(b.name));
	res.render("pages/admin-muted.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons"),
		},
		channelData: getChannelData(svr),
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			moderation: {
				isEnabled: serverDocument.config.moderation.isEnabled,
			},
		},
		muted: mutedMembers,
	});
};
controllers.administration.muted.post = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	if (req.body["new-member"] && req.body["new-channel_id"]) {
		const member = await findQueryUser(req.body["new-member"], svr);
		const ch = svr.channels.find(channel => channel.id === req.body["new-channel_id"]);

		let memberDocument = serverDocument.members.id(member.user.id);
		if (!memberDocument) {
			serverDocument.members.push({ _id: member.id });
			memberDocument = serverDocument.members.id(member.user.id);
		}

		if (member && client.getUserBotAdmin(svr, serverDocument, member) === 0 && ch && !memberDocument.muted.id(ch.id)) {
			client.IPC.send("muteMember", { guild: svr.id, channel: ch.id, member: member.user.id });
			memberDocument.muted.push({ _id: ch.id });
		}
	} else {
		let memberDocuments = serverDocument.members;
		Object.keys(req.body).forEach(key => {
			const parameters = key.split("-");
			if (parameters.length === 3 && parameters[0] === "muted" && svr.memberList.includes(parameters[1]) && memberDocuments.id(parameters[1])) {
				const memberDocument = memberDocuments.id(parameters[1]);
				if (parameters[2] === "removed") {
					// Muted member removed
					for (let memberMutedDocument of memberDocument.muted) {
						client.IPC.send("unmuteMember", { guild: svr.id, channel: memberMutedDocument._id, member: parameters[1] });
					}
					memberDocument.muted = [];
				} else if (svr.channels.includes(parameters[2]) && req.body[key] === "on" && !memberDocument.muted.id(parameters[2])) {
					// Muted member new channels
					client.IPC.send("muteMember", { guild: svr.id, channel: parameters[2], member: parameters[1] });
					memberDocument.muted.push({ _id: parameters[2] });
				}
			}
		});
		// Muted members channels removed
		memberDocuments = serverDocument.members.filter(member => member.muted && member.muted.length > 0 && svr.memberList.includes(member._id));
		memberDocuments.forEach(memberDocument => {
			memberDocument.muted.forEach(memberMutedDocument => {
				if (!req.body[`muted-${memberDocument._id}-${memberMutedDocument._id}`]) {
					client.IPC.send("unmuteMember", { guild: svr.id, channel: memberMutedDocument._id, member: memberDocument._id });
					memberDocument.muted.pull(memberMutedDocument._id);
				}
			});
		});
	}
	save(req, res, true);
};

controllers.administration.strikes = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;


	const memberDocuments = serverDocument.members.filter(memberDocument => svr.memberList.includes(memberDocument._id) && memberDocument.strikes.length > 0);
	const allStrikeDocuments = memberDocuments.map(memberDocument => memberDocument.strikes);
	const fetchList = [...memberDocuments.map(memberDocument => memberDocument._id)];
	allStrikeDocuments.forEach(strikeDocument => fetchList.push(strikeDocument._id));
	await svr.fetchMember(fetchList);

	res.render("pages/admin-strikes.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
		},
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			moderation: {
				isEnabled: serverDocument.config.moderation.isEnabled,
			},
		},
		strikes: await Promise.all(memberDocuments.map(async memberDocument => {
			const member = svr.members[memberDocument._id];
			const strikeDocuments = memberDocument.strikes;
			return {
				name: member.user.username,
				id: member.user.id,
				avatar: client.getAvatarURL(member.user.id, member.user.avatar) || "/static/img/discord-icon.png",
				strikes: strikeDocuments.map(strikeDocument => {
					const creator = svr.members[strikeDocument._id] || {
						id: "invalid-user",
						user: {
							username: "invalid-user",
							avatarURL: "/static/img/discord-icon.png",
						},
					};
					return {
						creator: {
							name: creator.user.username,
							id: creator.user.id,
							avatar: client.getAvatarURL(creator.user.id, creator.user.avatar) || "/static/img/discord-icon.png",
						},
						reason: md.makeHtml(xssFilters.inHTMLData(strikeDocument.reason)),
						rawDate: moment(strikeDocument.timestamp).format(configJS.moment_date_format),
						relativeDate: moment(strikeDocument.timestamp).fromNow(),
					};
				}),
			};
		})),
	});
};
controllers.administration.strikes.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-member"] && req.body["new-reason"]) {
		const member = await findQueryUser(req.body["new-member"], req.svr);
		if (member && req.app.client.getUserBotAdmin(req.svr, serverDocument, member) === 0) {
			let memberDocument = serverDocument.members.id(member.user.id);
			if (!memberDocument) {
				serverDocument.members.push({ _id: member.user.id });
				memberDocument = serverDocument.members.id(member.user.id);
			}
			memberDocument.strikes.push({
				_id: req.consolemember.user.id,
				reason: req.body["new-reason"],
			});
		}
	} else {
		for (const key in req.body) {
			const args = key.split("-");
			if (args[0] === "strikes" && !isNaN(args[1]) && args[2] === "removeall") {
				const memberDocument = serverDocument.members.id(args[1]);
				if (memberDocument) {
					memberDocument.strikes = [];
				}
			} else if (args[0] === "removestrike" && !isNaN(args[1]) && !isNaN(args[2])) {
				const memberDocument = serverDocument.members.id(args[1]);
				if (memberDocument) {
					memberDocument.strikes.splice(args[2], 1);
				}
			}
		}
	}

	save(req, res, true);
};

controllers.administration.status = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	const statusMessagesData = serverDocument.toObject().config.moderation.status_messages;
	await svr.fetchMember(statusMessagesData.member_streaming_message.enabled_user_ids);
	for (let i = 0; i < statusMessagesData.member_streaming_message.enabled_user_ids.length; i++) {
		const member = svr.members[statusMessagesData.member_streaming_message.enabled_user_ids[i]] || { user: {} };
		statusMessagesData.member_streaming_message.enabled_user_ids[i] = {
			name: member.user.username,
			id: member.user.id,
			avatar: client.getAvatarURL(member.id, member.user.avatar) || "/static/img/discord-icon.png",
		};
	}
	res.render("pages/admin-status-messages.ejs", {
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
			moderation: {
				isEnabled: serverDocument.config.moderation.isEnabled,
				status_messages: statusMessagesData,
			},
		},
	});
};
controllers.administration.status.post = async (req, res) => {
	const serverDocument = req.svr.document;

	const args = Object.keys(req.body)[0].split("-");
	if (Object.keys(req.body).length === 1 && args[0] === "new" && serverDocument.config.moderation.status_messages[args[1]] && args[2] === "message") {
		if (args[1] === "member_streaming_message") {
			const member = await findQueryUser(req.body[Object.keys(req.body)[0]], req.svr);
			if (member && serverDocument.config.moderation.status_messages[args[1]].enabled_user_ids.indexOf(member.user.id) === -1) {
				serverDocument.config.moderation.status_messages[args[1]].enabled_user_ids.push(member.user.id);
			}
		} else if (serverDocument.config.moderation.status_messages[args[1]].messages) {
			serverDocument.config.moderation.status_messages[args[1]].messages.push(req.body[Object.keys(req.body)[0]]);
		}
	} else {
		for (const status_message in serverDocument.toObject().config.moderation.status_messages) {
			if (["new_member_pm", "member_removed_pm"].indexOf(status_message) === -1 && Object.keys(req.body).length > 1) {
				serverDocument.config.moderation.status_messages[status_message].channel_id = "";
			} else if (Object.keys(req.body).length > 1) {
				serverDocument.config.moderation.status_messages[status_message].message_content = req.body[`${status_message}-message_content`];
			}
			if (Object.keys(req.body).length > 1) {
				for (const key in serverDocument.toObject().config.moderation.status_messages[status_message]) {
					switch (key) {
						case "isEnabled":
							serverDocument.config.moderation.status_messages[status_message][key] = req.body[`${status_message}-${key}`] === "on";
							break;
						case "enabled_channel_ids":
							serverDocument.config.moderation.status_messages[status_message][key] = [];
							req.svr.channels.forEach(ch => {
								if (ch.type === "text") {
									if (req.body[`${status_message}-${key}-${ch.id}`]) {
										serverDocument.config.moderation.status_messages[status_message][key].push(ch.id);
									}
								}
							});
							break;
						case "channel_id":
							if (["message_edited_message", "message_deleted_message"].indexOf(status_message) > -1 && req.body[`${status_message}-type`] === "msg") {
								break;
							}
							// Fallthrough
						case "type":
							serverDocument.config.moderation.status_messages[status_message][key] = req.body[`${status_message}-${key}`];
							break;
					}
				}
			}
			const key = status_message === "member_streaming_message" ? "enabled_user_ids" : "messages";
			if (serverDocument.config.moderation.status_messages[status_message][key]) {
				for (let i = 0; i < serverDocument.config.moderation.status_messages[status_message][key].length; i++) {
					if (req.body[`${status_message}-${i}-removed`]) {
						serverDocument.config.moderation.status_messages[status_message][key][i] = null;
					}
				}
				serverDocument.config.moderation.status_messages[status_message][key].spliceNullElements();
			}
		}
	}

	save(req, res, true);
};

controllers.administration.filters = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;
	await svr.fetchCollection("roles");

	const filteredCommands = [];
	for (const command in serverDocument.toObject().config.commands) {
		const commandData = client.getPublicCommandMetadata(command);
		if (commandData && commandData.defaults.isNSFWFiltered) {
			filteredCommands.push(command);
		}
	}
	res.render("pages/admin-filters.ejs", {
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
			moderation: {
				isEnabled: serverDocument.config.moderation.isEnabled,
				filters: serverDocument.toObject().config.moderation.filters,
			},
		},
		config: {
			filtered_commands: `<code>${filteredCommands.sort().join("</code>, <code>")}</code>`,
		},
	});
};
controllers.administration.filters.post = async (req, res) => {
	const serverDocument = req.svr.document;

	for (const filter in serverDocument.toObject().config.moderation.filters) {
		for (const key in serverDocument.toObject().config.moderation.filters[filter]) {
			switch (key) {
				case "isEnabled":
				case "delete_messages":
				case "delete_message":
					serverDocument.config.moderation.filters[filter][key] = req.body[`${filter}-${key}`] === "on";
					break;
				case "disabled_channel_ids":
					serverDocument.config.moderation.filters[filter][key] = [];
					req.svr.channels.forEach(ch => {
						if (ch.type === "text") {
							if (req.body[`${filter}-${key}-${ch.id}`] !== "on") {
								serverDocument.config.moderation.filters[filter][key].push(ch.id);
							}
						}
					});
					break;
				case "keywords":
					serverDocument.config.moderation.filters[filter][key] = req.body[`${filter}-${key}`].split(",");
					break;
				default:
					serverDocument.config.moderation.filters[filter][key] = req.body[`${filter}-${key}`];
					break;
			}
		}
	}

	save(req, res, true);
};

controllers.administration.MOTD = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;
	await svr.fetchCollection("roles");

	res.render("pages/admin-message-of-the-day.ejs", {
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
			message_of_the_day: serverDocument.config.message_of_the_day,
		},
	});
};
controllers.administration.MOTD.post = async (req, res) => {
	const serverDocument = req.svr.document;

	const alreadyEnabled = serverDocument.config.message_of_the_day.isEnabled;
	serverDocument.config.message_of_the_day.isEnabled = req.body.isEnabled === "on";
	serverDocument.config.message_of_the_day.message_content = req.body.message_content;
	serverDocument.config.message_of_the_day.channel_id = req.body.channel_id;
	serverDocument.config.message_of_the_day.interval = parseInt(req.body.interval);

	save(req, res, true);

	if (!alreadyEnabled && serverDocument.config.message_of_the_day.isEnabled) {
		createMessageOfTheDay(req, req.svr.id);
	}
};

controllers.administration.voicetext = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	res.render("pages/admin-voicetext-channels.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
		},
		voiceChannelData: getChannelData(svr, "voice"),
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			voicetext_channels: serverDocument.config.voicetext_channels,
		},
	});
};
controllers.administration.voicetext.post = async (req, res) => {
	const serverDocument = req.svr.document;

	serverDocument.config.voicetext_channels = [];
	req.svr.channels.forEach(ch => {
		if (ch.type === "voice") {
			if (req.body[`voicetext_channels-${ch.id}`] === "on") {
				serverDocument.config.voicetext_channels.push(ch.id);
			}
		}
	});

	save(req, res, true);
};

controllers.administration.roles = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;
	await svr.fetchCollection("roles");

	res.render("pages/admin-roles.ejs", {
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
			commands: {
				perms: serverDocument.config.commands.perms,
				role: serverDocument.config.commands.role,
				roleinfo: serverDocument.config.commands.roleinfo,
			},
			custom_roles: serverDocument.config.custom_roles,
		},
		commandDescriptions: {
			perms: client.getPublicCommandMetadata("perms").description,
			role: client.getPublicCommandMetadata("role").description,
			roleinfo: client.getPublicCommandMetadata("roleinfo").description,
		},
		commandCategories: {
			perms: client.getPublicCommandMetadata("perms").category,
			role: client.getPublicCommandMetadata("role").category,
			roleinfo: client.getPublicCommandMetadata("roleinfo").category,
		},
	});
};
controllers.administration.roles.post = async (req, res) => {
	const serverDocument = req.svr.document;
	await req.svr.fetchCollection("roles");

	parsers.commandOptions(req, "roleinfo", req.body);
	parsers.commandOptions(req, "role", req.body);
	serverDocument.config.custom_roles = [];
	req.svr.roles.forEach(role => {
		if (role.name !== "@everyone" && role.name.indexOf("color-") !== 0) {
			if (req.body[`custom_roles-${role.id}`] === "on") {
				serverDocument.config.custom_roles.push(role.id);
			}
		}
	});
	parsers.commandOptions(req, "perms", req.body);

	save(req, res, true);
};

controllers.administration.logs = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	try {
		let serverLogs = serverDocument.logs.length > 200 ? serverDocument.logs.toObject().slice(serverDocument.logs.length - 200) : serverDocument.logs.toObject();
		serverLogs = serverLogs.filter(serverLog => (!req.query.q || serverLog.content.toLowerCase().includes(req.query.q.toLowerCase())) && (!req.query.chid || serverLog.channelid === req.query.chid));
		const fetchList = [];
		serverLogs.forEach(serverLog => svr.members[serverLog.userid] || fetchList.push(serverLog.userid));
		await svr.fetchMember(fetchList);
		serverLogs.map(serverLog => {
			const ch = serverLog.channelid ? svr.channels[serverLog.channelid] : null;
			if (serverLog.channelid) serverLog.ch = ch ? ch.name : "invalid-channel";

			const member = serverLog.userid ? svr.members[serverLog.userid] : null;
			if (serverLog.userid) serverLog.usr = member ? `${member.user.username}#${member.user.discriminator}` : "invalid-user";

			switch (serverLog.level) {
				case "warn":
					serverLog.level = "exclamation";
					serverLog.levelColor = "#ffdd57";
					break;
				case "error":
					serverLog.level = "times";
					serverLog.levelColor = "#ff3860";
					break;
				case "save":
					serverLog.level = "file-text";
					serverLog.levelColor = "#ffae35";
					break;
				default:
					serverLog.level = "info";
					serverLog.levelColor = "#3273dc";
					break;
			}

			serverLog.moment = moment(serverLog.timestamp).format(configJS.moment_date_format);

			return serverLog;
		});

		res.render("pages/admin-logs.ejs", {
			authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
			sudo: req.isSudo,
			serverData: {
				name: svr.name,
				id: svr.id,
				icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
			},
			channelData: getChannelData(svr),
			currentPage: `${req.baseUrl}${req.path}`,
			logData: serverLogs.reverse(),
			searchQuery: req.query.q,
			channelQuery: req.query.chid,
		});
	} catch (err) {
		winston.warn(`Failed to fetch logs for server ${svr.name} (*-*)\n`, err);
		renderError(res, "Failed to fetch all the trees and their logs.");
	}
};

controllers.other = {};

controllers.other.nameDisplay = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	res.render("pages/admin-name-display.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
		},
		currentPage: `${req.baseUrl}${req.path}`,
		configData: {
			name_display: serverDocument.config.name_display,
		},
		exampleUsername: req.consolemember.user.username,
		exampleNickname: req.consolemember.nickname,
		exampleDiscriminator: req.consolemember.user.discriminator,
		currentExample: client.getName(svr, serverDocument, req.consolemember),
	});
};
controllers.other.nameDisplay.post = async (req, res) => {
	const serverDocument = req.svr.document;

	serverDocument.config.name_display.use_nick = req.body["name_display-use_nick"] === "on";
	serverDocument.config.name_display.show_discriminator = req.body["name_display-show_discriminator"] === "on";

	save(req, res, true);
};

controllers.other.activities = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	const ongoingTrivia = [];
	const ongoingPolls = [];
	const ongoingGiveaways = [];
	const ongoingLotteries = [];
	const fetchList = [];

	serverDocument.channels.forEach(channelDocument => {
		if (channelDocument.poll.isOngoing) fetchList.push(channelDocument.poll.creator_id);
		if (channelDocument.lottery.isOngoing) fetchList.push(channelDocument.lottery.creator_id);
		if (channelDocument.giveaway.isOngoing) fetchList.push(channelDocument.giveaway.creator_id);
	});
	await svr.fetchMember(fetchList);

	serverDocument.channels.forEach(channelDocument => {
		const ch = svr.channels[channelDocument._id];
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

	let generalChannel = svr.channels.find(ch => (ch.name === "general" || ch.name === "mainchat") && ch.type === "text");

	if (generalChannel) {
		defaultChannel = generalChannel;
	} else {
		defaultChannel = svr.channels.filter(c => c.type === "text")
			.sort((a, b) => a.rawPosition - b.rawPosition)
			.first();
	}

	res.render("pages/admin-ongoing-activities.ejs", {
		authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
		sudo: req.isSudo,
		serverData: {
			name: svr.name,
			id: svr.id,
			icon: client.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
			defaultChannel: defaultChannel.name,
		},
		currentPage: `${req.baseUrl}${req.path}`,
		trivia: ongoingTrivia,
		polls: ongoingPolls,
		giveaways: ongoingGiveaways,
		lotteries: ongoingLotteries,
		commandPrefix: client.getCommandPrefix(svr, serverDocument),
	});
};
controllers.other.activities.post = async (req, res) => {
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

controllers.other.public = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
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
controllers.other.public.post = async (req, res) => {
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

controllers.other.extensions = async (req, res) => {
	res.render("pages/503.ejs", {});
};

controllers.other.export = async (req, res) => {
	res.json(req.svr.document.toObject().config);
};
