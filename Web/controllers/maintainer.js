const path = require("path");
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
const { Tail } = require("tail");

const { getRoundedUptime, saveMaintainerConsoleOptions: save, getChannelData, canDo, renderError } = require("../helpers");
const { GetGuild } = require("../../Modules").getGuild;
const Constants = require("../../Internals/Constants");

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
	}]);
	let messageCount = 0;
	if (result) {
		messageCount = result[0].total;
	}

	const trafficData = await req.app.client.traffic.data();
	const version = await req.app.client.central.API("versions").branch(configJSON.branch).get(configJSON.version)
		.catch(() => null);
	let checkData = version && await version.check();
	if (!checkData) checkData = { utd: false, current: null };

	res.setPageData({
		serverCount: await req.app.client.guilds.totalCount,
		userCount: await req.app.client.users.totalCount,
		totalMessageCount: messageCount,
		roundedUptime: getRoundedUptime(process.uptime()),
		trafficData,
		currentShard: req.app.client.shardID,
		page: "maintainer.ejs",
	});

	res.setConfigData({
		shardCount: configJS.shardTotal,
		version: configJSON.version,
		utd: checkData.utd,
		currentVersion: checkData.current && checkData.current.tag,
		disabled: !checkData.current,
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

		if (req.query.leave !== undefined) {
			req.app.client.IPC.send("leaveGuild", data[parseInt(req.query.i)].id);
			renderPage();
		} else if (req.query.block !== undefined) {
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
	if (req.body.removeFromActivity && !configJSON.activityBlocklist.includes(req.body.removeFromActivity)) {
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
		let usr = await Users.findOne({ username: req.body["new-user"] });
		if (!usr) usr = await req.app.client.users.fetch(req.body["new-user"], true);

		if (usr && !configJSON.userBlocklist.includes(usr.id ? usr.id : usr._id) && !configJSON.maintainers.includes(usr.id ? usr.id : usr._id)) {
			configJSON.userBlocklist.push(usr.id ? usr.id : usr._id);
		}
	} else {
		configJSON.userBlocklist.forEach(usrid => {
			if (req.body[`block-${usrid}-removed`] !== undefined) {
				configJSON.userBlocklist.splice(configJSON.userBlocklist.indexOf(usrid), 1);
			}
		});
	}

	save(req, res);
};

controllers.options.bot = async (req, { res }) => {
	res.setConfigData({
		status: configJSON.status,
		type: configJSON.activity.type,
		game: configJSON.activity.name,
		game_default: configJSON.activity.name === "default",
		twitchURL: configJSON.activity.twitchURL,
		avatar: req.app.client.user.avatarURL({ type: "png", size: 512 }),
	}).setPageData("page", "maintainer-bot-user.ejs").render();
};
controllers.options.bot.post = async (req, res) => {
	req.app.client.IPC.send("updateBotUser", {
		avatar: req.body.avatar,
		username: req.body.username,
		game: req.body.game,
		status: req.body.status,
		type: req.body.type,
		twitchURL: req.body.twitch,
	});
	configJSON.activity.name = req.body.game;
	configJSON.activity.type = req.body.type;
	configJSON.activity.twitchURL = req.body.twitch;
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
		dirname: path.join(__dirname, "../public/img/"),
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
				avatar: usr.avatarURL ? usr.displayAvatarURL() || "/static/img/discord-icon.png" : "/static/img/discord-icon.png",
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
				avatar: usr.avatarURL ? usr.displayAvatarURL() || "/static/img/discord-icon.png" : "/static/img/discord-icon.png",
			};
		}))),
	}).setPageData({
		showRemove: configJSON.maintainers.includes(req.user.id),
		page: "maintainer-wiki-contributors.ejs",
	}).render();
};
controllers.options.contributors.post = async (req, res) => {
	if (req.body["new-user"]) {
		let usr = await Users.findOne({ username: req.body["new-user"] });
		if (!usr) usr = await req.app.client.users.fetch(req.body["new-user"], true);
		if (!usr.id) usr.id = usr._id;
		if (usr && !configJSON.wikiContributors.includes(usr.id)) {
			configJSON.wikiContributors.push(usr.id);
		}
	} else {
		const i = configJSON.wikiContributors.indexOf(req.body["contributor-removed"]);
		configJSON.wikiContributors.splice(i, 1);
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
				avatar: usr.avatarURL ? usr.displayAvatarURL() || "/static/img/discord-icon.png" : "/static/img/discord-icon.png",
				isSudoMaintainer: configJSON.sudoMaintainers.includes(usr.id),
			};
		})),
		perms: configJSON.perms,
	}).setPageData("page", "maintainer-maintainers.ejs").render();
};
controllers.management.maintainers.post = async (req, res) => {
	if (req.level !== 2 && req.level !== 0) return res.sendStatus(403);
	if (req.body["new-user"]) {
		let usr = await Users.findOne({ username: req.body["new-user"] });
		if (!usr) usr = await req.app.client.users.fetch(req.body["new-user"], true);
		if (!usr.id) usr.id = usr._id;

		if (usr && !configJSON.maintainers.includes(usr.id)) {
			configJSON.maintainers.push(usr.id);
		}
		if (usr && req.body.isSudo === "true" && !configJSON.sudoMaintainers.includes(usr.id)) {
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
			const value = req.body[perm];
			[, perm] = perm.split("-");
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
	const data = await req.app.client.IPC.send("shardData", {});
	res.setConfigData({
		shardTotal: Number(process.env.SHARD_COUNT),
		data,
	}).setPageData({
		currentShard: req.app.client.shardID,
		page: "maintainer-shards.ejs",
	}).render();
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

controllers.management.injection = async (req, { res }) => {
	res.setConfigData({
		injection: configJSON.injection,
	}).setPageData({
		page: "maintainer-injection.ejs",
	}).render();
};
controllers.management.injection.post = async (req, res) => {
	Object.keys(configJSON.injection).forEach(key => {
		if (req.body[key] || req.body[key] === "") configJSON.injection[key] = req.body[key];
	});

	save(req, res, true);
};

controllers.management.version = async (req, { res }) => {
	const version = await req.app.client.central.API("versions").branch(configJSON.branch).get(configJSON.version);
	if (version && version.metadata) version.metadata.changelog = md.makeHtml(version.metadata.changelog);
	const checkData = await version.check();
	if (checkData.current) checkData.current.metadata.changelog = md.makeHtml(checkData.current.metadata.changelog);
	const isDownloaded = checkData && checkData.current && await version.checkDownload(checkData.current.tag);

	res.setPageData({
		disabled: !version.valid,
		latestVersion: checkData.current,
		installedVersion: version,
		utd: checkData.utd,
		isDownloaded,
		page: "maintainer-version.ejs",
	}).setConfigData({
		version: configJSON.version,
		branch: configJSON.branch,
	}).render();
};
controllers.management.version.post = async (req, res) => {
	res.sendStatus(204);
};
controllers.management.version.socket = async socket => {
	socket.on("disconnect", () => {
		if (socket.isUpdateFinished || !socket.isUpdating) return;
		logger.error("Lost connection to Updater client. Shutting down GAB in an attempt to resync states (⇀‸↼‶)");
		socket.route.router.app.client.IPC.send("shutdown", { err: true });
	});
	socket.on("download", async data => {
		if (!data || !data.branch || !data.tag) return socket.emit("err", { error: 400, fatal: false });
		const version = await socket.route.router.app.client.central.API("versions").branch(data.branch).get(data.tag);
		if (!version.valid) return socket.emit("err", { error: 404, fatal: false });

		let pushQueue = 0;
		let finished = false;
		socket.emit("totalChunks", Constants.CODEBASE_TOTAL_CHUNK_SIZE);
		const sendChunkQueue = () => {
			if (finished) return;
			socket.emit("chunk", pushQueue);
			pushQueue = 0;
			setTimeout(sendChunkQueue, Math.floor(Math.random() * 1000));
		};
		sendChunkQueue();
		try {
			await version.download(({ length }) => {
				pushQueue += length;
			});
		} catch (err) {
			finished = true;
			return socket.emit("err", { error: 500, fatal: false });
		}

		finished = true;
		socket.emit("downloadSuccess");
	});
	socket.on("install", async data => {
		const version = await socket.route.router.app.client.central.API("versions").branch(data.branch).get(data.tag);
		if (!await version.checkDownload()) {
			return socket.emit("err", { error: 404, fatal: true, message: "That version has not been downloaded yet." });
		}

		version.on("installLog", log => {
			socket.emit("installLog", log);
		});
		version.on("installFinish", async () => {
			configJSON.version = version.tag;
			configJSON.branch = version.branch;
			socket.request.app = socket.route.router.app;
			await save(socket.request, null, true, true);
			socket.emit("installFinish");
		});

		await version.install();
	});
};

controllers.management.eval = async (req, { res }) => {
	res.setConfigData("shardTotal", Number(process.env.SHARD_COUNT))
		.setPageData("page", "maintainer-eval.ejs")
		.render();
};
controllers.management.eval.post = async (req, res) => {
	if (req.body.code && req.body.target) {
		const result = await req.app.client.IPC.send("evaluate", { code: req.body.code, target: req.body.target });
		res.send(JSON.stringify(result));
		logger.info(`Maintainer ${req.user.username} executed JavaScript from the Maintainer Console!`, { maintainer: req.user.id, code: req.body.code, target: req.body.target });
	} else {
		res.sendStatus(400);
	}
};

controllers.management.logs = async (req, { res }) => {
	logger.winstonLogger.transports[2].query({ limit: 10, order: "desc" }, (err, results) => {
		if (err) return renderError(res, "An error occurred while fetching old logs");

		results.reverse();
		const logs = JSON.stringify(results);

		res.setPageData({
			logs,
			page: "maintainer-logs.ejs",
		}).render();
	});
};
controllers.management.logs.socket = async socket => {
	const send = data => {
		data = JSON.parse(data);
		socket.emit("logs", data);
	};

	const tail = new Tail(path.join(__dirname, "../../logs/console.gawesomebot.log"), { useWatchFile: process.platform === "win32" });

	tail.on("line", send);
	tail.watch();

	socket.on("disconnect", () => tail.unwatch());
};
