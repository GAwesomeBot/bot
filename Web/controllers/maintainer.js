const { getRoundedUptime, saveMaintainerConsoleOptions: save, getChannelData } = require("../helpers");
const Updater = require("../../Modules/Updater");
const { GetGuild } = require("../../Modules").getGuild;

const path = require("path");

const controllers = module.exports;

controllers.maintainer = async (req, { res }) => {
	const result = await Servers.aggregate([{
		$group: {
			_id: null,
			total: {
				$sum: {
					$add: ["$messages_today"],
				},
			},
		},
	}]).exec();
	let messageCount = 0;
	if (result) {
		messageCount = result[0].total;
	}

	const trafficData = req.app.client.traffic.data();
	const version = await Updater.check();

	res.setPageData({
		serverCount: await req.app.client.guilds.totalCount,
		userCount: await req.app.client.users.totalCount,
		totalMessageCount: messageCount,
		roundedUptime: getRoundedUptime(process.uptime()),
		trafficData: await trafficData,
		currentShard: req.app.client.shardID,
		page: "maintainer.ejs",
	});

	res.setConfigData({
		shardCount: configJS.shardTotal,
		version: configJSON.version,
		utd: version["up-to-date"],
		latestVersion: version.latest ? version.latest.version : null,
		disabled: version === 404,
	});

	res.render();
};

controllers.servers = {};

controllers.servers.list = async (req, { res }) => {
	const renderPage = data => {
		res.setPageData({
			activeSearchQuery: req.query.q,
			selectedServer: req.query.i || "0",
			page: "maintainer-server-list.ejs",
		});
		if (data) res.setConfigData(data);
		res.render();
	};

	if (req.query.q) {
		const query = req.query.q.toLowerCase();
		let data = await GetGuild.getAll(req.app.client, { parse: "noKeys", findFilter: query, fullResolveMaps: ["channels"] });
		if (data) {
			data = data.map(svr => ({
				name: svr.name,
				id: svr.id,
				icon: req.app.client.getAvatarURL(svr.id, svr.icon, "icons"),
				channelData: getChannelData(svr),
			}));
		}
		if (data.length < parseInt(req.query.i) + 1) req.query.i = 0;

		if (req.query.leave) {
			req.app.client.IPC.send("leaveGuild", data[parseInt(req.query.i)].id);
			renderPage();
		} else if (req.query.block) {
			req.app.client.IPC.send("leaveGuild", data[parseInt(req.query.i)].id);
			configJSON.guildBlocklist.push(data[parseInt(req.query.i)].id);
			save(req, res, true, true);
			renderPage();
		} else if (req.query.message) {
			req.app.client.IPC.send("sendMessage", { guild: data[parseInt(req.query.i)].id, channel: req.query.chid, message: req.query.message });
			res.sendStatus(200);
		} else {
			renderPage(data);
		}
	} else {
		renderPage();
	}
};
controllers.servers.list.post = async (req, res) => {
	if (req.body.removeFromActivity) {
		configJSON.activityBlocklist.push(req.body.removeFromActivity);
	}
	if (req.body.unbanFromActivity) {
		const index = configJSON.activityBlocklist.indexOf(req.body.unbanFromActivity);
		if (index > -1) configJSON.activityBlocklist.splice(index, 1);
	}
	save(req, res, true);
};

controllers.servers.bigmessage = async (req, { res }) => {
	res.setPageData({
		serverCount: await req.app.client.guilds.totalCount,
		page: "maintainer-big-message.ejs",
	}).render();
};
controllers.servers.bigmessage.post = async (req, res) => {
	if (req.body.message) {
		req.app.client.IPC.send("sendMessage", { guild: "*", message: req.body.message });
		res.sendStatus(200);
	} else {
		res.sendStatus(400);
	}
};

controllers.options = {};

controllers.options.blocklist = async (req, { res }) => {
	res.setConfigData({
		global_blocklist: await Promise.all(configJSON.userBlocklist.map(async a => {
			const usr = await req.app.client.users.fetch(a, true) || {};
			return {
				name: usr.username,
				id: usr.id,
				avatar: req.app.client.getAvatarURL(usr.id, usr.avatar) || "/static/img/discord-icon.png",
			};
		})),
	}).setPageData("page", "maintainer-blocklist.ejs").render();
};
controllers.options.blocklist.post = async (req, res) => {
	if (req.body["new-user"]) {
		let usr = await Users.findOne({ username: req.body["new-user"] }).exec();
		if (!usr) usr = await req.app.client.users.fetch(req.body["new-user"], true);

		if (usr && !configJSON.userBlocklist.includes(usr.id ? usr.id : usr._id) && !configJSON.maintainers.includes(usr.id ? usr.id : usr._id)) {
			configJSON.userBlocklist.push(usr.id ? usr.id : usr._id);
		}
	} else {
		for (let i = 0; i < configJSON.userBlocklist.length; i++) {
			if (req.body[`block-${i}-removed`] !== undefined) {
				configJSON.userBlocklist[i] = null;
			}
		}
		configJSON.userBlocklist.spliceNullElements();
	}

	save(req, res);
};

controllers.options.bot = async (req, { res }) => {
	res.setConfigData({
		status: configJSON.status,
		game: configJSON.activity.name,
		game_default: configJSON.activity.name === "default",
		avatar: req.app.client.user.avatarURL(),
	}).setPageData("page", "maintainer-bot-user.ejs").render();
};
controllers.options.bot.post = async (req, res) => {
	req.app.client.IPC.send("updateBotUser", { avatar: req.body.avatar, username: req.body.username, game: req.body.game, status: req.body.status });
	configJSON.activity.name = req.body.game;
	if (req.body.game === "gawesomebot.com") {
		configJSON.activity.name = "default";
	}
	if (req.body.status) configJSON.status = req.body.status;
	save(req, res, true);
};

controllers.options.homepage = async (req, { res }) => {
	res.setConfigData({
		headerImage: configJSON.headerImage,
		homepageMessageHTML: configJSON.homepageMessageHTML,
	}).setPageData({
		dirname: path.join(__dirname, "/public/static/img/"),
		page: "maintainer-homepage.ejs",
	}).render();
};
controllers.options.homepage.post = async (req, res) => {
	configJSON.homepageMessageHTML = req.body.homepageMessageHTML;
	configJSON.headerImage = req.body.header_image;

	save(req, res, true);
};

controllers.options.contributors = async (req, { res }) => {
	res.setConfigData({
		wiki_contributors: await Promise.all(configJSON.maintainers.map(async a => {
			const usr = await req.app.client.users.fetch(a, true) || {
				id: "invalid-user",
				username: "invalid-user",
			};
			return {
				name: usr.username,
				id: usr.id,
				avatar: usr.avatarURL ? usr.avatarURL() || "/static/img/discord-icon.png" : "/static/img/discord-icon.png",
				isMaintainer: true,
				isSudoMaintainer: configJSON.sudoMaintainers.includes(usr.id),
			};
		}).concat(configJSON.wikiContributors.map(async a => {
			const usr = await req.app.client.users.fetch(a, true) || {
				id: "invalid-user",
				username: "invalid-user",
			};
			return {
				name: usr.username,
				id: usr.id,
				avatar: usr.avatarURL ? usr.avatarURL() || "/static/img/discord-icon.png" : "/static/img/discord-icon.png",
			};
		}))),
	}).setPageData({
		showRemove: configJSON.maintainers.includes(req.user.id),
		page: "maintainer-wiki-contributors.ejs",
	}).render();
};
controllers.options.contributors.post = async (req, res) => {
	if (req.body["new-user"]) {
		let usr = await Users.findOne({ username: req.body["new-user"] }).exec();
		if (!usr) usr = await req.app.client.users.fetch(req.body["new-user"], true);
		if (!usr.id) usr.id = usr._id;
		if (usr && configJSON.wikiContributors.indexOf(usr.id) === -1) {
			configJSON.wikiContributors.push(usr.id);
		}
	} else if (configJSON.maintainers.includes(req.user.id)) {
		let i = configJSON.wikiContributors.indexOf(req.body["contributor-removed"]);
		configJSON.wikiContributors[i] = null;
		configJSON.wikiContributors.spliceNullElements();
	}

	save(req, res);
};

controllers.management = {};

controllers.management.maintainers = async (req, { res }) => {
	res.setConfigData({
		maintainers: await Promise.all(configJSON.maintainers.map(async id => {
			const usr = await req.app.client.users.fetch(id, true) || {
				id: "invalid-user",
				username: "invalid-user",
			};
			return {
				name: usr.username,
				id: usr.id,
				avatar: usr.avatarURL ? usr.avatarURL() || "/static/img/discord-icon.png" : "/static/img/discord-icon.png",
				isSudoMaintainer: configJSON.sudoMaintainers.includes(usr.id),
			};
		})),
		perms: configJSON.perms,
	}).setPageData("page", "maintainer-maintainers.ejs").render();
};
controllers.management.maintainers.post = async (req, res) => {
	if (req.level !== 2 && req.level !== 0) return res.sendStatus(403);
	if (req.body["new-user"]) {
		let usr = await Users.findOne({ username: req.body["new-user"] }).exec();
		if (!usr) usr = await req.app.client.users.fetch(req.body["new-user"], true);
		if (!usr.id) usr.id = usr._id;

		if (usr && !configJSON.maintainers.includes(usr.id)) {
			configJSON.maintainers.push(usr.id);
		}
		if (usr && req.body[`isSudo`] === "true" && !configJSON.sudoMaintainers.includes(usr.id)) {
			configJSON.sudoMaintainers.push(usr.id);
		}
	} else {
		if (req.body[`maintainer-removed`]) {
			configJSON.maintainers[configJSON.maintainers.indexOf(req.body[`maintainer-removed`])] = null;
			configJSON.sudoMaintainers[configJSON.sudoMaintainers.indexOf(req.body[`maintainer-removed`])] = null;
		}
		if (req.body[`maintainer-sudo`]) {
			if (configJSON.sudoMaintainers.includes(req.body[`maintainer-sudo`])) configJSON.sudoMaintainers[configJSON.sudoMaintainers.indexOf(req.body[`maintainer-sudo`])] = null;
			else configJSON.sudoMaintainers.push(req.body[`maintainer-sudo`]);
		}

		configJSON.maintainers.spliceNullElements();
		configJSON.sudoMaintainers.spliceNullElements();

		const perms = Object.keys(req.body).filter(param => param.startsWith("perm-"));
		perms.forEach(perm => {
			let value = req.body[perm];
			perm = perm.split("-")[1];
			if (configJSON.perms[perm] === 0 && process.env.GAB_HOST !== req.user.id) return;
			switch (value) {
				case "sudo":
					configJSON.perms[perm] = 2;
					break;
				case "host":
					configJSON.perms[perm] = 0;
					break;
				default:
					configJSON.perms[perm] = 1;
			}
		});
	}

	if (req.body["additional-perms"]) return save(req, res, true);
	save(req, res);
};
