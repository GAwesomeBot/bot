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

const { saveAdminConsoleOptions: save, parseAuthUser, getChannelData, getRoleData, findQueryUser, createMessageOfTheDay, renderError } = require("../../helpers");
const parsers = require("../../parsers");

const controllers = module.exports;

controllers.admins = async (req, res) => {
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
controllers.admins.post = (req, res) => {
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

controllers.moderation = async (req, res) => {
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
controllers.moderation.post = async (req, res) => {
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

controllers.blocked = async (req, res) => {
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
controllers.blocked.post = async (req, res) => {
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

controllers.muted = async (req, res) => {
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
controllers.muted.post = async (req, res) => {
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

controllers.strikes = async (req, res) => {
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
controllers.strikes.post = async (req, res) => {
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

controllers.status = async (req, res) => {
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
controllers.status.post = async (req, res) => {
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

controllers.filters = async (req, res) => {
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
controllers.filters.post = async (req, res) => {
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

controllers.MOTD = async (req, res) => {
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
controllers.MOTD.post = async (req, res) => {
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

controllers.voicetext = async (req, res) => {
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
controllers.voicetext.post = async (req, res) => {
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

controllers.roles = async (req, res) => {
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
controllers.roles.post = async (req, res) => {
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

controllers.logs = async (req, res) => {
	const client = req.app.client;
	const svr = req.svr;
	const serverDocument = req.svr.document;

	try {
		let serverLogs = serverDocument.logs.length > 200 ? serverDocument.logs.toObject().slice(serverDocument.logs.length - 200) : serverDocument.logs.toObject();
		serverLogs = serverLogs.filter(serverLog => (!req.query.q || serverLog.content.toLowerCase().includes(req.query.q.toLowerCase())) && (!req.query.chid || serverLog.channelid === req.query.chid));
		const fetchList = [];
		serverLogs.forEach(serverLog => svr.members[serverLog.userid] || fetchList.push(serverLog.userid));
		await svr.fetchMember(fetchList);
		const channels = {};
		svr.channels.forEach(ch => {
			channels[ch.id] = ch;
		});
		serverLogs.map(serverLog => {
			const ch = serverLog.channelid ? channels[serverLog.channelid] : null;
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
