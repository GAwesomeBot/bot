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
const getGuild = require('../Modules').GetGuild;

const parsers = module.exports;

parsers.serverData = async (req, serverDocument, webp = false) => {
	let data;
	let svr = await getGuild.get(req.bot, serverDocument._id, { resolve: ["icon", "createdAt", "ownerID", "id", "name"], members: ["nickname", "user"] });
	if (svr) {
		const owner = req.bot.users.get(svr.ownerID) || svr.members[svr.ownerID].user;
		data = {
			name: svr.name,
			id: svr.id,
			icon: req.bot.getAvatarURL(svr.id, svr.icon, "icons", webp),
			owner: {
				username: owner.username,
				id: owner.id,
				avatar: req.bot.getAvatarURL(owner.id, owner.avatar, "avatars", webp),
				name: owner.username,
			},
			members: Object.keys(svr.members).length,
			messages: serverDocument.messages_today,
			rawCreated: moment(svr.createdAt).format(configJS.moment_date_format),
			relativeCreated: Math.ceil((Date.now() - new Date(svr.createdAt)) / 86400000),
			command_prefix: req.bot.getCommandPrefix(svr, serverDocument),
			category: serverDocument.config.public_data.server_listing.category,
			description: serverDocument.config.public_data.server_listing.isEnabled ? md.makeHtml(xssFilters.inHTMLData(serverDocument.config.public_data.server_listing.description || "No description provided.")) : null,
			invite_link: serverDocument.config.public_data.server_listing.isEnabled ? serverDocument.config.public_data.server_listing.invite_link || "javascript:alert('Invite link not available');" : null,
		};
	}
	return data;
};


parsers.userData = async (req, usr, userDocument) => {
	const botServers = Object.values(await getGuild.get(req.bot, "*", { resolve: ["name", "id", "icon", "ownerID"], mutual: usr.id }));
	const mutualServers = botServers.sort((a, b) => a.name.localeCompare(b.name));
	const userProfile = {
		username: usr.username,
		discriminator: usr.discriminator,
		avatar: usr.avatarURL() || "/static/img/discord-icon.png",
		id: usr.id,
		status: usr.presence.status,
		game: await req.bot.getGame(usr),
		roundedAccountAge: moment(usr.createdAt).fromNow(),
		rawAccountAge: moment(usr.createdAt).format(configJS.moment_date_format),
		backgroundImage: userDocument.profile_background_image || "http://i.imgur.com/8UIlbtg.jpg",
		points: userDocument.points || 1,
		lastSeen: userDocument.last_seen ? moment(userDocument.last_seen).fromNow() : null,
		rawLastSeen: userDocument.last_seen ? moment(userDocument.last_seen).format(configJS.moment_date_format) : null,
		mutualServerCount: Object.keys(mutualServers).length,
		pastNameCount: (userDocument.past_names || {}).length || 0,
		isAfk: userDocument.afk_message !== undefined && userDocument.afk_message !== "" && userDocument.afk_message !== null,
		mutualServers: [],
		isMaintainer: configJSON.maintainers.includes(usr.id) || configJSON.sudoMaintainers.includes(usr.id),
		isContributor: configJSON.wikiContributors.includes(usr.id) || configJSON.maintainers.includes(usr.id) || configJSON.sudoMaintainers.includes(usr.id),
		isSudoMaintainer: configJSON.sudoMaintainers.includes(usr.id),
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
		for (let svr of mutualServers) {
			const owner = await req.bot.users.fetch(svr.ownerID, true);
			userProfile.mutualServers.push({
				name: svr.name,
				id: svr.id,
				icon: req.bot.getAvatarURL(svr.id, svr.icon, "icons"),
				owner: owner.username,
			});
		}
	}
	return userProfile;
};

parsers.extensionData = async (req, galleryDocument) => {
	const owner = await req.bot.users.fetch(galleryDocument.owner_id, true) || {};
	let typeIcon, typeDescription;
	switch (galleryDocument.type) {
		case "command":
			typeIcon = "magic";
			typeDescription = galleryDocument.key;
			break;
		case "keyword":
			typeIcon = "key";
			typeDescription = galleryDocument.keywords.join(", ");
			break;
		case "timer":
			typeIcon = "clock-o";
			if (moment(galleryDocument.interval)) {
				let interval = moment.duration(galleryDocument.interval);
				typeDescription = `${interval.hours()} hour(s) and ${interval.minutes()} minute(s)`;
			} else {
				typeDescription = `${galleryDocument.interval}ms`;
			}
			break;
		case "event":
			typeIcon = "code";
			typeDescription = `${galleryDocument.event}`;
			break;
	}
	return {
		_id: galleryDocument._id,
		name: galleryDocument.name,
		type: galleryDocument.type,
		typeIcon,
		typeDescription,
		description: md.makeHtml(xssFilters.inHTMLData(galleryDocument.description)),
		featured: galleryDocument.featured,
		owner: {
			name: owner.username || "invalid-user",
			id: owner.id || "invalid-user",
			discriminator: owner.discriminator || "0000",
			avatar: owner.avatarURL() || "/static/img/discord-icon.png",
		},
		status: galleryDocument.state,
		points: galleryDocument.points,
		relativeLastUpdated: moment(galleryDocument.last_updated).fromNow(),
		rawLastUpdated: moment(galleryDocument.last_updated).format(configJS.moment_date_format),
		scopes: galleryDocument.scopes,
		fields: galleryDocument.fields,
		timeout: galleryDocument.timeout,
	};
};

parsers.blogData = async (req, blogDocument) => {
	const author = await req.client.users.fetch(blogDocument.author_id, true) || {
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
	const avatarURL = (await req.client.users.fetch(blogDocument.author_id, true)).avatarURL();
	return {
		id: blogDocument._id,
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
