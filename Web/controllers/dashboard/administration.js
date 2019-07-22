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
	extensions: [require("showdown-xss-filter")],
});
md.setFlavor("github");

const { saveAdminConsoleOptions: save, getChannelData, getRoleData, findQueryUser, createMessageOfTheDay, renderError } = require("../../helpers");
const parsers = require("../../parsers");

const controllers = module.exports;

controllers.admins = async (req, { res }) => {
	const adminDocuments = req.svr.document.config.admins.filter(adminDocument => req.svr.roles.includes(adminDocument._id));
	await req.svr.fetchCollection("roles");

	res.setPageData({
		page: "admin-admins.ejs",
		roleData: getRoleData(req.svr).filter(role => req.svr.document.config.admins.id(role.id) === undefined),
	});
	res.setConfigData({
		admins: adminDocuments.map(adminDocument => {
			adminDocument.name = req.svr.roles.find(role => role.id === adminDocument._id).name;
			return adminDocument;
		}),
	});
	res.render();
};
controllers.admins.post = (req, res) => {
	if (req.body["new-role_id"] && req.body["new-level"] && !req.svr.document.config.admins.id(req.body["new-role_id"])) {
		let level = parseInt(req.body["new-level"]);
		if (isNaN(level) || level > 3 || level < 1) level = 1;
		req.svr.queryDocument.push("config.admins", {
			_id: req.body["new-role_id"],
			level,
		});
	} else {
		req.svr.document.config.admins.forEach(admin => {
			if (req.body[`admin-${admin._id}-removed`]) {
				req.svr.queryDocument.pull("config.admins", admin);
			}
		});
	}

	save(req, res);
};

controllers.moderation = async (req, { res }) => {
	const svr = await req.svr.fetchCollection("roles");
	const serverDocument = req.svr.document;

	res.setPageData({
		page: "admin-moderation.ejs",
		channelData: getChannelData(svr),
		roleData: getRoleData(svr),
	});
	res.setConfigData({
		moderation: {
			isEnabled: serverDocument.config.moderation.isEnabled,
			autokick_members: serverDocument.config.moderation.autokick_members,
			new_member_roles: serverDocument.config.moderation.new_member_roles,
		},
		modlog: {
			isEnabled: serverDocument.modlog.isEnabled,
			channel_id: serverDocument.modlog.channel_id,
		},
	});
	res.render();
};
controllers.moderation.post = async (req, res) => {
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

	save(req, res, true);
};

controllers.blocked = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	const blockedMembers = svr.memberList.filter(member => serverDocument.config.blocked.includes(member))
		.concat(configJSON.userBlocklist.filter(usrid => svr.memberList.includes(usrid)));
	await svr.fetchMember(blockedMembers);

	res.setConfigData({
		blocked: blockedMembers.map(ID => {
			const member = svr.members[ID];
			return	{
				name: member.user.username,
				id: member.user.id,
				avatar: client.getAvatarURL(member.user.id, member.user.avatar) || "/static/img/discord-icon.png",
				isGlobal: configJSON.userBlocklist.includes(member.user.id),
			};
		}),
		moderation: {
			isEnabled: serverDocument.config.moderation.isEnabled,
		},
	});
	res.render("pages/admin-blocked.ejs");
};
controllers.blocked.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	if (req.body["new-member"]) {
		const member = await findQueryUser(req.body["new-member"], req.svr);
		if (member && !serverDocument.config.blocked.includes(member.user.id) && req.app.client.getUserBotAdmin(req.svr, serverDocument, member) === 0) {
			serverQueryDocument.push("config.blocked", member.user.id);
		}
	}
	save(req, res);
};

controllers.muted = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	const mutedMemberList = Object.values(serverDocument.members).filter(memberDocument => memberDocument.muted && memberDocument.muted.length > 0 && svr.memberList.includes(memberDocument._id));
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

	res.setPageData({
		page: "admin-muted.ejs",
		channelData: getChannelData(svr),
	});
	res.setConfigData({
		moderation: {
			isEnabled: serverDocument.config.moderation.isEnabled,
		},
		muted: mutedMembers,
	});
	res.render();
};
controllers.muted.post = async (req, res) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	if (req.body["new-member"] && req.body["new-channel_id"]) {
		const member = await findQueryUser(req.body["new-member"], svr);
		const ch = svr.channels.find(channel => channel.id === req.body["new-channel_id"]);

		let memberDocument = serverDocument.members[member.user.id];
		if (!memberDocument) {
			serverQueryDocument.push("members", { _id: member.user.id });
			memberDocument = serverDocument.members[member.user.id];
		}
		const memberQueryDocument = serverQueryDocument.clone.id("members", member.user.id);

		if (member && client.getUserBotAdmin(svr, serverDocument, member) === 0 && ch && !memberDocument.muted.id(ch.id)) {
			client.IPC.send("muteMember", { guild: svr.id, channel: ch.id, member: member.user.id });
			memberQueryDocument.push("muted", { _id: ch.id });
		}
	} else {
		let memberDocuments = serverDocument.members;
		Object.keys(req.body).forEach(key => {
			const parameters = key.split("-");
			if (parameters.length === 3 && parameters[0] === "muted" && svr.memberList.includes(parameters[1]) && memberDocuments[parameters[1]]) {
				const memberDocument = memberDocuments[parameters[1]];
				const memberQueryDocument = serverQueryDocument.clone.id("members", memberDocument._id);
				if (svr.channels.some(ch => ch.id === parameters[2]) && req.body[key] === "on" && !memberDocument.muted.id(parameters[2])) {
					// Muted member new channels
					client.IPC.send("muteMember", { guild: svr.id, channel: parameters[2], member: parameters[1] });
					memberQueryDocument.push("muted", { _id: parameters[2] });
				}
			}
		});
		// Muted members channels removed
		memberDocuments = Object.values(serverDocument.members).filter(member => member.muted && member.muted.length > 0 && svr.memberList.includes(member._id));
		memberDocuments.forEach(memberDocument => {
			const memberQueryDocument = serverQueryDocument.clone.id("members", memberDocument._id);
			memberDocument.muted.forEach(memberMutedDocument => {
				if (!req.body[`muted-${memberDocument._id}-${memberMutedDocument._id}`]) {
					client.IPC.send("unmuteMember", { guild: svr.id, channel: memberMutedDocument._id, member: memberDocument._id });
					memberQueryDocument.pull("muted", memberMutedDocument._id);
				}
			});
		});
	}
	save(req, res, true);
};

controllers.strikes = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;


	const memberDocuments = Object.values(serverDocument.members).filter(memberDocument => svr.memberList.includes(memberDocument._id) && memberDocument.strikes.length > 0);
	const allStrikeDocuments = memberDocuments.map(memberDocument => memberDocument.strikes);
	const fetchList = [...memberDocuments.map(memberDocument => memberDocument._id)];
	allStrikeDocuments.forEach(strikeDocument => fetchList.push(strikeDocument.admin));
	await svr.fetchMember(fetchList);

	res.setConfigData({
		moderation: {
			isEnabled: serverDocument.config.moderation.isEnabled,
		},
		strikes: await Promise.all(memberDocuments.map(async memberDocument => {
			const member = svr.members[memberDocument._id];
			const strikeDocuments = memberDocument.strikes;
			return {
				name: member.user.username,
				id: member.user.id,
				avatar: client.getAvatarURL(member.user.id, member.user.avatar) || "/static/img/discord-icon.png",
				strikes: strikeDocuments.map(strikeDocument => {
					const creator = svr.members[strikeDocument.admin] || {
						id: "invalid-user",
						user: {
							username: "invalid-user",
							avatarURL: "/static/img/discord-icon.png",
						},
					};
					return {
						id: strikeDocument._id,
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
	res.render("pages/admin-strikes.ejs");
};
controllers.strikes.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	if (req.body["new-member"] && req.body["new-reason"]) {
		const member = await findQueryUser(req.body["new-member"], req.svr);
		if (member && req.app.client.getUserBotAdmin(req.svr, serverDocument, member) === 0) {
			let memberDocument = serverDocument.members[member.user.id];
			if (!memberDocument) {
				serverQueryDocument.push("members", { _id: member.user.id });
				memberDocument = serverDocument.members[member.user.id];
			}
			serverQueryDocument.clone.id("members", memberDocument._id).push("strikes", {
				admin: req.consolemember.user.id,
				reason: req.body["new-reason"],
			});
		}
	} else {
		for (const key in req.body) {
			const args = key.split("-");
			if (args[0] === "strikes" && !isNaN(args[1]) && args[2] === "removeall") {
				const memberQueryDocument = serverQueryDocument.clone.id("members", args[1]);
				if (memberQueryDocument.val) {
					memberQueryDocument.set("strikes", []);
				}
			} else if (args[0] === "removestrike" && !isNaN(args[1]) && args[2]) {
				const memberQueryDocument = serverQueryDocument.id("members", args[1]);
				if (memberQueryDocument.val) {
					memberQueryDocument.pull("strikes", args[2]);
				}
			}
		}
	}

	save(req, res, true);
};

controllers.status = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;

	const statusMessagesData = serverDocument.config.moderation.status_messages;
	await svr.fetchMember(statusMessagesData.member_streaming_message.enabled_user_ids);
	for (let i = 0; i < statusMessagesData.member_streaming_message.enabled_user_ids.length; i++) {
		const member = svr.members[statusMessagesData.member_streaming_message.enabled_user_ids[i]] || { user: {} };
		statusMessagesData.member_streaming_message.enabled_user_ids[i] = {
			name: member.user.username,
			id: member.user.id,
			avatar: client.getAvatarURL(member.id, member.user.avatar) || "/static/img/discord-icon.png",
		};
	}

	res.setPageData({
		page: "admin-status-messages.ejs",
		channelData: getChannelData(svr),
	});
	res.setConfigData({
		moderation: {
			isEnabled: serverDocument.config.moderation.isEnabled,
			status_messages: statusMessagesData,
		},
	});
	res.render();
};
controllers.status.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	const args = Object.keys(req.body)[0].split("-");
	if (Object.keys(req.body).length === 1 && args[0] === "new" && serverDocument.config.moderation.status_messages[args[1]] && args[2] === "message") {
		if (args[1] === "member_streaming_message") {
			const member = await findQueryUser(req.body[Object.keys(req.body)[0]], req.svr);
			if (member && !serverDocument.config.moderation.status_messages[args[1]].enabled_user_ids.includes(member.user.id)) {
				serverQueryDocument.push(`config.moderation.status_messages.${args[1]}.enabled_user_ids`, member.user.id);
			}
		} else if (serverDocument.config.moderation.status_messages[args[1]].messages) {
			serverQueryDocument.push(`config.moderation.status_messages.${args[1]}.messages`, req.body[Object.keys(req.body)[0]]);
		}
	} else {
		for (const status_message in serverDocument.config.moderation.status_messages) {
			if (!["new_member_pm", "member_removed_pm"].includes(status_message) && Object.keys(req.body).length > 1) {
				serverQueryDocument.set(`config.moderation.status_messages.${status_message}.channel_id`, "");
			} else if (Object.keys(req.body).length > 1) {
				serverQueryDocument.set(`config.moderation.status_messages.${status_message}.message_content`, req.body[`${status_message}-message_content`]);
			}
			if (Object.keys(req.body).length > 1) {
				for (const key in serverDocument.config.moderation.status_messages[status_message]) {
					switch (key) {
						case "isEnabled":
							serverQueryDocument.set(`config.moderation.status_messages.${status_message}.${key}`, req.body[`${status_message}-${key}`] === "on");
							break;
						case "enabled_channel_ids":
							serverQueryDocument.set(`config.moderation.status_messages.${status_message}.${key}`, []);
							req.svr.channels.forEach(ch => {
								if (ch.type === "text") {
									if (req.body[`${status_message}-${key}-${ch.id}`]) {
										serverQueryDocument.push(`config.moderation.status_messages.${status_message}.${key}`, ch.id);
									}
								}
							});
							break;
						case "channel_id":
							if (["message_edited_message", "message_deleted_message"].includes(status_message) && req.body[`${status_message}-type`] === "msg") {
								break;
							}
						// Fallthrough
						case "type":
							if (req.body[`${status_message}-${key}`]) serverQueryDocument.set(`config.moderation.status_messages.${status_message}.${key}`, req.body[`${status_message}-${key}`]);
							break;
					}
				}
			}
			const key = status_message === "member_streaming_message" ? "enabled_user_ids" : "messages";
			if (serverDocument.config.moderation.status_messages[status_message][key]) {
				serverDocument.config.moderation.status_messages[status_message][key].forEach((message, i) => {
					if (req.body[`${status_message}-${i}-removed`]) {
						serverQueryDocument.pull(`config.moderation.status_messages.${status_message}.${key}`, message);
					}
				});
			}
		}
	}

	save(req, res, true);
};

controllers.filters = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;
	await svr.fetchCollection("roles");

	const filteredCommands = [];
	for (const command in serverDocument.config.commands) {
		const commandData = client.getPublicCommandMetadata(command);
		if (commandData && commandData.defaults.isNSFWFiltered) {
			filteredCommands.push(command);
		}
	}

	res.setPageData({
		page: "admin-filters.ejs",
		channelData: getChannelData(svr),
		roleData: getRoleData(svr),
	});
	res.setConfigData({
		moderation: {
			isEnabled: serverDocument.config.moderation.isEnabled,
			filters: serverDocument.config.moderation.filters,
			filtered_commands: `<code>${filteredCommands.sort().join("</code>, <code>")}</code>`,
		},
	});
	res.render();
};
controllers.filters.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	for (const filter in serverDocument.config.moderation.filters) {
		for (const key in serverDocument.config.moderation.filters[filter]) {
			switch (key) {
				case "isEnabled":
				case "delete_messages":
				case "delete_message":
					serverQueryDocument.set(`config.moderation.filters.${filter}.${key}`, req.body[`${filter}-${key}`] === "on");
					break;
				case "disabled_channel_ids":
					serverQueryDocument.set(`config.moderation.filters.${filter}.${key}`, []);
					req.svr.channels.forEach(ch => {
						if (ch.type === "text") {
							if (req.body[`${filter}-${key}-${ch.id}`] !== "on") {
								serverQueryDocument.push(`config.moderation.filters.${filter}.${key}`, ch.id);
							}
						}
					});
					break;
				case "keywords":
					serverQueryDocument.set(`config.moderation.filters.${filter}.${key}`, req.body[`${filter}-${key}`].split(","));
					break;
				case "mention_sensitivity":
				case "message_sensitivity":
					serverQueryDocument.set(`config.moderation.filters.${filter}.${key}`, parseInt(req.body[`${filter}-${key}`]));
					break;
				default:
					// eslint-disable-next-line max-len
					if (req.body[`${filter}-${key}`] !== undefined) serverQueryDocument.set(`config.moderation.filters.${filter}.${key}`, req.body[`${filter}-${key}`] === "on" || req.body[`${filter}-${key}`]);
					break;
			}
		}
	}

	save(req, res, true);
};

controllers.MOTD = async (req, { res }) => {
	const { svr } = req;
	const serverDocument = req.svr.document;
	await svr.fetchCollection("roles");

	res.setPageData({
		page: "admin-message-of-the-day.ejs",
		channelData: getChannelData(svr),
		roleData: getRoleData(svr),
	});
	res.setConfigData({
		message_of_the_day: serverDocument.config.message_of_the_day,
	});
	res.render();
};
controllers.MOTD.post = async (req, res) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	const alreadyEnabled = serverDocument.config.message_of_the_day.isEnabled;
	const oldInterval = serverDocument.config.message_of_the_day.interval;
	serverQueryDocument.set("config.message_of_the_day.isEnabled", req.body.isEnabled === "on")
		.set("config.message_of_the_day.message_content", req.body.message_content)
		.set("config.message_of_the_day.channel_id", req.body.channel_id)
		.set("config.message_of_the_day.interval", parseInt(req.body.interval));

	save(req, res, true);

	if ((!alreadyEnabled && serverDocument.config.message_of_the_day.isEnabled) || oldInterval !== serverDocument.config.message_of_the_day.interval) {
		createMessageOfTheDay(req, req.svr.id);
	}
};

controllers.voicetext = async (req, { res }) => {
	const { svr } = req;
	const serverDocument = req.svr.document;

	res.setPageData({
		page: "admin-voicetext-channels.ejs",
		voiceChannelData: getChannelData(svr, "voice"),
	});
	res.setConfigData({
		voicetext_channels: serverDocument.config.voicetext_channels,
	});
	res.render();
};
controllers.voicetext.post = async (req, res) => {
	const serverQueryDocument = req.svr.queryDocument;

	serverQueryDocument.set("config.voicetext_channels", []);
	req.svr.channels.forEach(ch => {
		if (ch.type === "voice") {
			if (req.body[`voicetext_channels-${ch.id}`] === "on") {
				serverQueryDocument.push("config.voicetext_channels", ch.id);
			}
		}
	});

	save(req, res, true);
};

controllers.roles = async (req, { res }) => {
	const { client } = req.app;
	const { svr } = req;
	const serverDocument = req.svr.document;
	await svr.fetchCollection("roles");

	res.setPageData({
		page: "admin-roles.ejs",
		channelData: getChannelData(svr),
		roleData: getRoleData(svr),
		commandDescriptions: {
			role: client.getPublicCommandMetadata("role").description,
			roleinfo: client.getPublicCommandMetadata("roleinfo").description,
		},
		commandCategories: {
			role: client.getPublicCommandMetadata("role").category,
			roleinfo: client.getPublicCommandMetadata("roleinfo").category,
		},
	});
	res.setConfigData({
		commands: {
			role: serverDocument.config.commands.role,
			roleinfo: serverDocument.config.commands.roleinfo,
		},
		custom_roles: serverDocument.config.custom_roles,
	});
	res.render();
};
controllers.roles.post = async (req, res) => {
	const serverQueryDocument = req.svr.queryDocument;
	await req.svr.fetchCollection("roles");

	parsers.commandOptions(req, "roleinfo", req.body);
	parsers.commandOptions(req, "role", req.body);
	serverQueryDocument.set("config.custom_roles", []);
	req.svr.roles.forEach(role => {
		if (role.name !== "@everyone" && role.name.indexOf("color-") !== 0) {
			if (req.body[`custom_roles-${role.id}`] === "on") {
				serverQueryDocument.push("config.custom_roles", role.id);
			}
		}
	});

	save(req, res, true);
};

controllers.logs = async (req, { res }) => {
	const { svr } = req;
	const serverDocument = req.svr.document;

	try {
		let serverLogs = serverDocument.logs.length > 200 ? serverDocument.logs.slice(serverDocument.logs.length - 200) : serverDocument.logs;
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

		res.setPageData({
			page: "admin-logs.ejs",
			channelData: getChannelData(svr),
			logData: serverLogs.reverse(),
			searchQuery: req.query.q,
			channelQuery: req.query.chid,
		});
		res.render();
	} catch (err) {
		logger.warn(`Failed to fetch logs for server ${svr.name} (*-*)`, {}, err);
		renderError(res, "Failed to fetch all the trees and their logs.");
	}
};
