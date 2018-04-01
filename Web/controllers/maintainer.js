const path = require("path");
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
const moment = require("moment");
const Tail = require("tail").Tail;

const { getRoundedUptime, saveMaintainerConsoleOptions: save, getChannelData, canDo, renderError } = require("../helpers");
const Updater = require("../../Modules/Updater");
const { GetGuild } = require("../../Modules").getGuild;

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

controllers.management.shards = async (req, { res }) => {
	let data = await req.app.client.IPC.send("shardData", {});
	res.setConfigData({
		shardTotal: Number(process.env.SHARD_COUNT),
		data,
	})
		.setPageData({
			currentShard: req.app.client.shardID,
			page: "maintainer-shards.ejs",
		})
		.render();
};
controllers.management.shards.post = async (req, res) => {
	const bot = req.app.client;

	if (!canDo("shutdown", req.user.id)) return res.sendStatus(403);

	if (req.body.dismiss) {
		await bot.IPC.send("dismissWarning", { warning: req.body.dismiss });
	}
	if (req.body["freeze-shard"]) {
		await bot.IPC.send("freezeShard", { shard: req.body["freeze-shard"] });
	}
	if (req.body["reset-shard"]) {
		await bot.IPC.send("restartShard", { shard: req.body["reset-shard"], soft: true });
	}
	if (req.body["restart-shard"]) {
		await bot.IPC.send("restartShard", { shard: req.body["restart-shard"], soft: false });
	}
	res.sendStatus(200);

	if (req.body.restart === "master") {
		bot.IPC.send("shutdown", { err: false, soft: true });
	}
	if (req.body.shutdown === "master") {
		bot.IPC.send("shutdown", { err: false });
	}
};

controllers.management.version = async (req, { res }) => {
	let version = await Updater.check();
	if (version.latest) version.latest.config.changelog = md.makeHtml(version.latest.config.changelog);

	res.setPageData({
		disabled: version === 404,
		latestVersion: version.latest ? JSON.stringify(version.latest) : undefined,
		utd: version["up-to-date"],
		page: "maintainer-version.ejs",
	})
		.setConfigData({
			version: configJSON.version,
			branch: configJSON.branch,
		})
		.render();
};
controllers.management.version.post = async (req, res) => {
	req.app.io.of("/dashboard/maintainer/management/version").on("connection", socket => {
		socket.on("update", data => {
			if (data === "start") {
				socket.emit("update", "prepare");
				Updater.update(req.app.client, configJSON, socket, winston);
			}
		});
		socket.on("disconnect", () => {
			if (socket.isUpdateFinished) return;
			winston.error("Lost connection to Updater client. Shutting down GAB in an attempt to resync states (⇀‸↼‶)");
			req.app.client.IPC.send("shutdown", { err: true });
		});
	});
	res.sendStatus(200);
};

controllers.management.eval = async (req, { res }) => {
	res.setConfigData("shardTotal", Number(process.env.SHARD_COUNT))
		.setPageData("page", "maintainer-eval.ejs")
		.render();
};
controllers.management.eval.post = async (req, res) => {
	if (req.body.code && req.body.target) {
		req.app.client.IPC.send("evaluate", { code: req.body.code, target: req.body.target }).then(result => {
			res.send(JSON.stringify(result));
		});
		winston.info(`Maintainer ${req.user.username} executed JavaScript from the Maintainer Console!`, { maintainer: req.user.id, code: req.body.code, target: req.body.target });
	} else {
		res.sendStatus(400);
	}
};

controllers.management.logs = async (req, { res }) => {
	winston.transports.file.query({ limit: 10 }, (err, results) => {
		if (err) return renderError(res, "An error occurred while fetching old logs");

		results.reverse();
		let logs = JSON.stringify(results.map(log => {
			log.timestamp = moment(log.timestamp).format("DD-MM-YYYY HH:mm:ss");
			return log;
		}));

		res.setPageData({
			logs,
			page: "maintainer-logs.ejs",
		}).render();
	});
};
controllers.management.logs.socket = async socket => {
	const send = data => {
		data = JSON.parse(data);
		data.timestamp = moment(data.timestamp).format("DD-MM-YYYY HH:mm:ss");
		socket.emit("logs", data);
	};

	const tail = new Tail(path.join(__dirname, "../../logs/verbose.gawesomebot.log"));

	tail.on("line", send);
	tail.watch();

	socket.on("disconnect", () => tail.unwatch());
};
