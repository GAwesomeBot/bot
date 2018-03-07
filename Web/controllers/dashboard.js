const getGuild = require("../../Modules").GetGuild;
const { parseAuthUser, canDo, getChannelData, getRoleData, saveAdminConsoleOptions: save } = require("../helpers");

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
