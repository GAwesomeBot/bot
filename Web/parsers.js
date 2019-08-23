/* eslint-disable max-len */
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
const { Constants } = require("../Internals");
const { GetGuild } = require("../Modules").getGuild;

const parsers = module.exports;

parsers.serverData = async (req, serverDocument, webp = false) => {
	let data = null;
	const svr = new GetGuild(req.app.client, serverDocument._id);
	await svr.initialize(["OWNER", req.app.client.user.id]);
	await svr.fetchProperty("createdAt");
	if (svr.success) {
		const owner = req.app.client.users.get(svr.ownerID) || svr.members[svr.ownerID] ? svr.members[svr.ownerID].user : { username: "invalid-user", id: "invalid-user" };
		data = {
			name: svr.name,
			id: svr.id,
			icon: req.app.client.getAvatarURL(svr.id, svr.icon, "icons", webp),
			owner: {
				username: owner.username,
				id: owner.id,
				avatar: req.app.client.getAvatarURL(owner.id, owner.avatar, "avatars", webp),
				name: owner.username,
			},
			members: svr.memberCount,
			messages: serverDocument.messages_today,
			rawCreated: moment(svr.createdAt).format(configJS.moment_date_format),
			relativeCreated: Math.ceil((Date.now() - new Date(svr.createdAt)) / 86400000),
			command_prefix: req.app.client.getCommandPrefix(svr, serverDocument),
			category: serverDocument.config.public_data.server_listing.category,
			description: serverDocument.config.public_data.server_listing.isEnabled ? md.makeHtml(xssFilters.inHTMLData(serverDocument.config.public_data.server_listing.description || "No description provided.")) : null,
			invite_link: serverDocument.config.public_data.server_listing.isEnabled ? serverDocument.config.public_data.server_listing.invite_link || "javascript:alert('Invite link not available');" : null,
		};
	}
	return data;
};


parsers.userData = async (req, usr, userDocument) => {
	const botServers = await GetGuild.getAll(req.app.client, { mutualOnlyTo: usr.id, fullResolveMembers: ["OWNER"], parse: "noKeys" });
	const mutualServers = botServers.sort((a, b) => a.name.localeCompare(b.name));
	const userProfile = {
		username: usr.username,
		discriminator: usr.discriminator,
		avatar: usr.displayAvatarURL() || "/static/img/discord-icon.png",
		id: usr.id,
		status: usr.presence.status,
		game: await req.app.client.getGame(usr),
		roundedAccountAge: moment(usr.createdAt).fromNow(),
		rawAccountAge: moment(usr.createdAt).format(configJS.moment_date_format),
		backgroundImage: userDocument.profile_background_image || "http://i.imgur.com/8UIlbtg.jpg",
		points: userDocument.points || 1,
		lastSeen: userDocument.last_seen ? moment(userDocument.last_seen).fromNow() : null,
		rawLastSeen: userDocument.last_seen ? moment(userDocument.last_seen).format(configJS.moment_date_format) : null,
		pastNameCount: (userDocument.past_names || {}).length || 0,
		isAfk: userDocument.afk_message !== undefined && userDocument.afk_message !== "" && userDocument.afk_message !== null,
		isMaintainer: configJSON.maintainers.includes(usr.id) || configJSON.sudoMaintainers.includes(usr.id),
		isContributor: configJSON.wikiContributors.includes(usr.id) || configJSON.maintainers.includes(usr.id) || configJSON.sudoMaintainers.includes(usr.id),
		isSudoMaintainer: configJSON.sudoMaintainers.includes(usr.id),
		mutualServers: [],
		mutualServerCount: mutualServers.length,
	};
	switch (userProfile.status) {
		case "online":
			userProfile.statusColor = "is-success";
			break;
		case "idle":
			userProfile.statusColor = "is-warning";
			break;
		case "dnd":
			userProfile.statusColor = "is-danger";
			userProfile.status = "Do Not Disturb";
			break;
		case "offline":
		default:
			userProfile.statusColor = "is-dark";
			break;
	}
	if (userDocument.isProfilePublic) {
		let profileFields;
		if (userDocument.profile_fields) {
			profileFields = {};
			for (const key in userDocument.profile_fields) {
				profileFields[key] = md.makeHtml(xssFilters.inHTMLData(userDocument.profile_fields[key]));
				profileFields[key] = profileFields[key].substring(3, profileFields[key].length - 4);
			}
		}
		userProfile.profileFields = profileFields;
		userProfile.pastNames = userDocument.past_names;
		userProfile.afkMessage = userDocument.afk_message;
		for (const svr of mutualServers) {
			const owner = svr.members[svr.ownerID] || { username: "invalid-user" };
			userProfile.mutualServers.push({
				name: svr.name,
				id: svr.id,
				icon: req.app.client.getAvatarURL(svr.id, svr.icon, "icons"),
				owner: owner.username,
			});
		}
	}
	return userProfile;
};

parsers.extensionData = async (req, galleryDocument, versionTag) => {
	const owner = await req.app.client.users.fetch(galleryDocument.owner_id, true) || {};
	const versionDocument = galleryDocument.versions.id(versionTag || galleryDocument.published_version);
	if (!versionDocument) return null;
	let typeIcon, typeDescription;
	const typeInfo = {};
	switch (versionDocument.type) {
		case "command":
			typeIcon = "magic";
			typeDescription = versionDocument.key;
			typeInfo.key = versionDocument.key;
			break;
		case "keyword":
			typeIcon = "key";
			typeDescription = versionDocument.keywords.join(", ");
			typeInfo.keywords = versionDocument.keywords;
			typeInfo.case_sensitive = versionDocument.case_sensitive;
			break;
		case "timer":
			typeIcon = "clock-o";
			if (moment(versionDocument.interval)) {
				const interval = moment.duration(versionDocument.interval);
				typeDescription = `${interval.hours()} hour(s) and ${interval.minutes()} minute(s)`;
			} else {
				typeDescription = `${versionDocument.interval}ms`;
			}
			typeInfo.interval = versionDocument.interval;
			break;
		case "event":
			typeIcon = "code";
			typeDescription = `${versionDocument.event}`;
			typeInfo.event = versionDocument.event;
			break;
	}
	const scopes = versionDocument.scopes.map(scope => Constants.Scopes[scope]);

	return {
		_id: galleryDocument._id.toString(),
		name: galleryDocument.name,
		version: versionTag || galleryDocument.published_version,
		type: versionDocument.type,
		typeIcon,
		typeDescription,
		typeInfo,
		description: md.makeHtml(xssFilters.inHTMLData(galleryDocument.description)),
		featured: galleryDocument.featured,
		owner: {
			name: owner.username || "invalid-user",
			id: owner.id || "invalid-user",
			discriminator: owner.discriminator || "0000",
			avatar: owner.displayAvatarURL() || "/static/img/discord-icon.png",
		},
		status: galleryDocument.state,
		level: galleryDocument.level,
		accepted: versionDocument.accepted,
		points: galleryDocument.points,
		relativeLastUpdated: moment(galleryDocument.last_updated).fromNow(),
		rawLastUpdated: moment(galleryDocument.last_updated).format(configJS.moment_date_format),
		scopes,
		fields: versionDocument.fields,
		timeout: versionDocument.timeout,
	};
};

parsers.blogData = async (req, blogDocument) => {
	const author = await req.app.client.users.fetch(blogDocument.author_id, true) || {
		id: "invalid-user",
		username: "invalid-user",
	};
	let categoryColor;
	switch (blogDocument.category) {
		case "Development":
			categoryColor = "is-warning";
			break;
		case "Announcement":
			categoryColor = "is-danger";
			break;
		case "New Stuff":
			categoryColor = "is-info";
			break;
		case "Tutorial":
			categoryColor = "is-success";
			break;
		case "Random":
			categoryColor = "is-primary";
			break;
	}
	const avatarURL = (await req.app.client.users.fetch(blogDocument.author_id, true)).displayAvatarURL();
	return {
		id: blogDocument._id.toString(),
		title: blogDocument.title,
		author: {
			name: author.username,
			id: author.id,
			avatar: avatarURL || "/static/img/discord-icon.png",
		},
		category: blogDocument.category,
		categoryColor,
		rawPublished: moment(blogDocument.published_timestamp).format(configJS.moment_date_format),
		roundedPublished: moment(blogDocument.published_timestamp).fromNow(),
		content: blogDocument.content,
	};
};

parsers.commandOptions = (req, command, data) => {
	const serverDocument = req.svr.document;
	const serverQueryDocument = req.svr.queryDocument;

	const commandData = req.app.client.getPublicCommandMetadata(command);
	if (commandData) {
		if (!serverDocument.config.commands[command]) {
			serverQueryDocument.set(`config.commands.${command}`, {});
		}
		if (commandData.defaults.adminLevel < 4) {
			serverQueryDocument.set(`config.commands.${command}.isEnabled`, data[`${command}-isEnabled`] === "on")
				.set(`config.commands.${command}.admin_level`, parseInt(data[`${command}-adminLevel`]) || 0)
				.set(`config.commands.${command}.disabled_channel_ids`, []);
			Object.values(req.svr.channels).forEach(ch => {
				if (ch.type === "text") {
					if (!data[`${command}-disabled_channel_ids-${ch.id}`]) {
						serverQueryDocument.push(`config.commands.${command}.disabled_channel_ids`, ch.id);
					}
				}
			});
		}
	}
};
