const { GetGuild } = require("../../../Modules").getGuild;
const { Utils: { TitlecasePermissions } } = require("../../../Modules");
const { canDo, getRoleData, getChannelData, saveAdminConsoleOptions: save } = require("../../helpers");

const discord = require("discord.js");

const controllers = module.exports;

controllers.home = async (req, { res }) => {
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
					const serverDocument = await Servers.findOne(req.user.guilds[i].id);
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

			res.setServerData(serverData);
			res.setPageData({
				page: "dashboard.ejs",
				rawJoinLink: configJS.oauthLink.format({ id: req.app.client.user.id, uri: configJS.hostingURL, perms: configJS.permissions }),
			});
			res.render();
		});
	}
};

controllers.overview = async (req, { res }) => {
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

		const topMemberID = Object.values(req.svr.document.members).sort((a, b) => b.messages - a.messages)[0];
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

		res.setPageData({
			page: "admin-overview.ejs",
			messagesToday: req.svr.document.messages_today,
			topCommand,
			memberCount: req.svr.memberCount,
			topMember: topMember ? {
				username: topMember.user.username,
				id: topMember.user.id,
				avatar: req.app.client.getAvatarURL(topMember.user.id, topMember.user.avatar) || "/static/img/discord-icon.png",
			} : null,
			richestMember: richestMember ? {
				username: richestMember.user.username,
				id: richestMember.user.id,
				avatar: req.app.client.getAvatarURL(richestMember.user.id, richestMember.user.avatar) || "/static/img/discord-icon.png",
			} : null,
		});

		res.render();
	}
};

controllers.setup = async (req, { res }) => {
	const permissions = req.query.permissions && new discord.Permissions(Number(req.query.permissions));
	const standardPermissions = new discord.Permissions(configJS.permissions);

	let missingPermissions = [];
	if (permissions && permissions.bitfield !== undefined) {
		const permissionsArray = permissions.toArray(false);
		missingPermissions = standardPermissions.toArray(false).filter(permission => !permissionsArray.includes(permission))
			.map(permission => TitlecasePermissions(permission));
	}

	const adminDocuments = req.svr.document.config.admins.filter(adminDocument => req.svr.roles.includes(adminDocument._id));
	await req.svr.fetchCollection("roles");

	const botNick = req.svr.members[req.app.client.user.id].nickname;
	const commandPrefix = req.svr.document.config.command_prefix;
	res.setConfigData({
		// Command Options
		command_cooldown: req.svr.document.config.command_cooldown,
		command_fetch_properties: req.svr.document.config.command_fetch_properties,
		command_prefix: commandPrefix === "@mention" ? `@${botNick || req.app.client.user.username} ` : commandPrefix,
		delete_command_messages: req.svr.document.config.delete_command_messages,

		// Admins
		admins: adminDocuments.map(adminDocument => {
			adminDocument.name = req.svr.roles.find(role => role.id === adminDocument._id).name;
			return adminDocument;
		}),

		// Moderation
		moderation: {
			isEnabled: req.svr.document.config.moderation.isEnabled,
			autokick_members: req.svr.document.config.moderation.autokick_members,
			new_member_roles: req.svr.document.config.moderation.new_member_roles,
		},
		modlog: {
			isEnabled: req.svr.document.modlog.isEnabled,
			channel_id: req.svr.document.modlog.channel_id,
		},

		// Public Data
		public_data: req.svr.document.config.public_data,
		isBanned: configJSON.activityBlocklist.includes(req.svr.id),
	});
	res.setPageData({
		missingPermissions,
		page: "admin-setup.ejs",

		// Command Options
		botName: botNick || req.app.client.user.username,

		// Admins
		roleData: getRoleData(req.svr).filter(role => req.svr.document.config.admins.id(role.id) === undefined),

		// Moderation
		channelData: getChannelData(req.svr),

		// Public Data
		canUnban: configJSON.maintainers.includes(req.consolemember.user.id) || process.env.GAB_HOST === req.consolemember.user.id,
	});
	res.render();
};
controllers.setup.post = async (req, { res }) => {
	// Command Options
	if (req.body.command_prefix !== req.app.client.getCommandPrefix(req.svr, req.svr.document)) {
		req.svr.queryDocument.set("config.command_prefix", req.body.command_prefix);
	}

	req.svr.queryDocument.set("config.delete_command_messages", req.body.delete_command_messages === "on")
		.set("config.chatterbot.isEnabled", req.body["chatterbot-isEnabled"] === "on");

	req.svr.queryDocument.set("config.command_cooldown", parseInt(req.body.command_cooldown) > 120000 || isNaN(parseInt(req.body.command_cooldown)) ? 0 : parseInt(req.body.command_cooldown));
	const defaultCount = req.svr.document.config.command_fetch_properties.default_count;
	req.svr.queryDocument.set("config.command_fetch_properties.default_count", isNaN(parseInt(req.body.default_count)) ? defaultCount : parseInt(req.body.default_count))
		.set("config.command_fetch_properties.max_count", isNaN(parseInt(req.body.max_count)) ? req.svr.document.config.command_fetch_properties.max_count : parseInt(req.body.max_count));

	// Moderation
	const serverQueryDocument = req.svr.queryDocument;
	await req.svr.fetchCollection("roles");

	serverQueryDocument.set("config.moderation.isEnabled", req.body.isEnabled === "on")
		.set("config.moderation.autokick_members.isEnabled", req.body["autokick_members-isEnabled"] === "on");
	if (req.body["autokick_members-max_inactivity"]) serverQueryDocument.set("config.moderation.autokick_members.max_inactivity", parseInt(req.body["autokick_members-max_inactivity"]));
	serverQueryDocument.set("config.moderation.new_member_roles", []);
	req.svr.roles.forEach(role => {
		if (role.name !== "@everyone" && role.name.indexOf("color-") !== 0) {
			if (req.body[`new_member_roles-${role.id}`] === "on") {
				serverQueryDocument.push("config.moderation.new_member_roles", role.id);
			}
		}
	});
	serverQueryDocument.set("modlog.isEnabled", req.body["modlog-isEnabled"] === "on");
	if (req.body["modlog-channel_id"]) serverQueryDocument.set("modlog.channel_id", req.body["modlog-channel_id"] || null);

	// Public Data
	serverQueryDocument.set("config.public_data.isShown", req.body.isShown === "on");
	let createInvite = false;
	if (!req.svr.document.config.public_data.server_listing.isEnabled && req.body["server_listing-isEnabled"] === "on") {
		createInvite = true;
	}
	serverQueryDocument.set("config.public_data.server_listing.isEnabled", req.body["server_listing-isEnabled"] === "on");
	serverQueryDocument.set("config.public_data.server_listing.category", req.body["server_listing-category"]);
	serverQueryDocument.set("config.public_data.server_listing.description", req.body["server_listing-description"]);

	save(req, res, true);
	if (createInvite) {
		req.app.client.IPC.send("createPublicInviteLink", { guild: req.svr.id });
	} else if (!req.body["server_listing-isEnabled"] && req.svr.document.config.public_data.server_listing.invite_link) {
		req.app.client.IPC.send("deletePublicInviteLink", { guild: req.svr.id });
	}
};

controllers.commands = require("./commands");
controllers.stats = require("./stats");
controllers.administration = require("./administration");
controllers.other = require("./other");
