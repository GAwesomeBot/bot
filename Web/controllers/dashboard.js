const getGuild = require("../../Modules").GetGuild;
const { parseAuthUser, canDo, getChannelData, getRoleData, saveAdminConsoleOptions: save, findQueryUser, renderError } = require("../helpers");
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
				const svr = await getGuild.get(req.app.client, req.user.guilds[i].id, { members: ["id", "roles"], convert: { id_only: true } });
				if (!svr && !((parseInt(req.user.guilds[i].permissions) >> 5) & 1)) {
					addServerData(++i, callback);
					return;
				}
				const data = {
					name: req.user.guilds[i].name,
					id: req.user.guilds[i].id,
					icon: req.user.guilds[i].icon ? `https://cdn.discordapp.com/icons/${req.user.guilds[i].id}/${req.user.guilds[i].icon}.jpg` : "/static/img/discord-icon.png",
					botJoined: svr !== null,
					isAdmin: false,
				};
				if (svr && usr) {
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
		const topMember = req.svr.members[topMemberID ? topMemberID._id : null];
		const memberIDs = Object.values(req.svr.members).map(a => a.id);

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
			richestMember = req.svr.members[userDocuments[0]._id];
		}
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
					id: req.svr.members[req.svr.ownerID].id,
					avatar: req.app.client.getAvatarURL(req.svr.members[req.svr.ownerID].id, req.svr.members[req.svr.ownerID].user.avatar) || "/static/img/discord-icon.png",
				},
			},
			currentPage: `${req.baseUrl}${req.path}`,
			messagesToday: req.svr.document.messages_today,
			topCommand,
			memberCount: Object.keys(req.svr.members).length,
			topMember: topMember ? {
				username: topMember.user.username,
				id: topMember.id,
				avatar: req.app.client.getAvatarURL(topMember.id, topMember.user.avatar) || "/static/img/discord-icon.png",
			} : null,
			topGame: topGame ? topGame._id : null,
			richestMember: richestMember ? {
				username: richestMember.user.username,
				id: richestMember.id,
				avatar: req.app.client.getAvatarURL(richestMember.id, richestMember.user.avatar) || "/static/img/discord-icon.png",
			} : null,
		});
	}
};

controllers.commands = {};

controllers.commands.options = async (req, res) => {
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
	req.svr.document.config.command_fetch_properties.default_count = isNaN(parseInt(req.body.default_count)) ? req.svr.document.config.command_fetch_properties.default_count : parseInt(req.body.default_count);
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
		Object.values(req.svr.channels).forEach(ch => {
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
				Object.values(req.svr.channels).forEach(ch => {
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

	const cleanTag = content => {
		let cleanContent = "";
		while (content.indexOf("<") > -1) {
			cleanContent += content.substring(0, content.indexOf("<"));
			content = content.substring(content.indexOf("<") + 1);
			if (content && content.indexOf(">") > 1) {
				const type = content.charAt(0);
				const id = content.substring(1, content.indexOf(">"));
				if (!isNaN(id)) {
					if (type === "@") {
						const usr = svr.members[id];
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
		data.configData.tags.list[i].content = cleanTag(data.configData.tags.list[i].content);
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
		const member = svr.members[data.configData.translated_messages[i]._id] || {};
		data.configData.translated_messages[i].username = member.user.username;
		data.configData.translated_messages[i].avatar = client.getAvatarURL(member.id, member.user.avatar) || "/static/img/discord-icon.png";
	}
	res.render("pages/admin-auto-translation.ejs", data);
};
controllers.commands.translation.post = async (req, res) => {
	const serverDocument = req.svr.document;

	if (req.body["new-member"] && req.body["new-source_language"]) {
		const member = findQueryUser(req.body["new-member"], req.svr.members);
		if (member && !serverDocument.config.translated_messages.id(member.id)) {
			const enabled_channel_ids = [];
			Object.values(req.svr.channels).forEach(ch => {
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
				Object.values(req.svr.channels).forEach(ch => {
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

controllers.administration = {};

controllers.administration.admins = (req, res) => {
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
			admins: req.svr.document.config.admins.filter(adminDocument => req.svr.roles.hasOwnProperty(adminDocument._id)).map(adminDocument => {
				adminDocument.name = req.svr.roles[adminDocument._id].name;
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
