const express = require("express");
const http = require("http");
const https = require("https");
const compression = require("compression");
const sio = require("socket.io");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejs = require("ejs");
const session = require("express-session");
const mongooseSessionStore = require("connect-mongo")(session);
const passport = require("passport");
const passportSocketIo = require("passport.socketio");
const discordStrategy = require("passport-discord").Strategy;
const discordOAuthScopes = ["identify", "guilds", "email"];
const toobusy = require("toobusy-js");
const fsn = require("fs-nextra");
const reload = require("require-reload")(require);

const middleware = require("./middleware");
const app = express();

const listen = async configJS => {
	const servers = {};

	if (global.configJS.cert && configJS.privKey && configJS.httpsPort) {
		if (configJS.httpsRedirect) {
			app.use(middleware.enforceProtocol);
		}
		let credentials;
		try {
			const privKey = await fsn.readFile(configJS.privKey, "utf8");
			const cert = await fsn.readFile(configJS.cert, "utf8");
			credentials = {
				key: privKey,
				cert: cert,
			};
		} catch (err) {
			winston.error("Something went wrong while reading the given HTTPS Private Key and Certificate *0*\n", err);
		}

		const httpsServer = servers.httpsServer = https.createServer(credentials, app);
		httpsServer.on("error", err => {
			winston.error("Something went wrong while starting the HTTPS Web Interface x/\n", err);
		});
		httpsServer.listen(configJS.httpsPort, configJS.serverIP, () => {
			winston.info(`Opened https web interface on ${configJS.serverIP}:${configJS.httpsPort}`);
		});
	}

	const server = servers.server = http.createServer(app);
	server.on("error", err => {
		winston.error("Something went wrong while starting the HTTP Web Interface x/\n", err);
	});
	server.listen(configJS.httpPort, configJS.serverIP, () => {
		winston.info(`Opened http web interface on ${configJS.serverIP}:${configJS.httpPort}`);
		process.setMaxListeners(0);
	});

	return servers;
};

// Setup the web server
exports.open = async (client, auth, configJS, winston) => {
	// Setup Express App object
	app.bot = app.client = client;
	app.auth = auth;
	app.toobusy = toobusy;
	app.routes = [];

	// We always recommend using a reverse proxy like nginx, so unless you're on port 80, always run GAB with the --proxy option!
	if (process.argv.includes("-p") || process.argv.includes("--proxy")) app.enable("trust proxy");

	// Configure global middleware & Server properties
	app.use(compression());

	app.use(bodyParser.urlencoded({
		extended: true,
		parameterLimit: 10000,
		limit: "5mb",
	}));
	app.use(bodyParser.json({
		parameterLimit: 10000,
		limit: "5mb",
	}));
	app.use(cookieParser());

	app.set("json spaces", 2);

	app.engine("ejs", ejs.renderFile);
	app.set("views", `${__dirname}/views`);
	app.set("view engine", "ejs");

	app.set("debug mode", process.argv.includes("--debug"));

	// Set the clientID and clientSecret from argv if needed
	if (process.argv.includes("--CID")) {
		auth.discord.clientID = process.argv[process.argv.indexOf("--CID") + 1];
		auth.discord.clientSecret = process.argv[process.argv.indexOf("--CID") + 2];
	}

	// Setup passport and express-session
	passport.use(new discordStrategy({
		clientID: auth.discord.clientID,
		clientSecret: auth.discord.clientSecret,
		callbackURL: `${configJS.hostingURL}login/callback`,
		scope: discordOAuthScopes,
	}, (accessToken, refreshToken, profile, done) => {
		process.nextTick(() => done(null, profile));
	}));

	passport.serializeUser((user, done) => {
		delete user.email;
		done(null, user);
	});
	passport.deserializeUser((id, done) => {
		done(null, id);
	});

	const sessionStore = new mongooseSessionStore({
		mongooseConnection: Database.Raw,
	});

	app.use(session({
		secret: configJS.secret,
		resave: false,
		saveUninitialized: false,
		store: sessionStore,
	}));
	app.use(passport.initialize());
	app.use(passport.session());
	app.passport = passport;

	app.use(middleware.setHeaders);

	app.use(middleware.logRequest);

	// (Horribly) serve public dir
	app.use("/static/:type", (req, res, next) => {
		if (req.get("Accept") && req.get("Accept").includes("image/webp") && req.params.type === "img" && ![".gif", "webp"].includes(req.path.substr(req.path.length - 4))) {
			res.redirect(`/static/img${req.path.substring(0, req.path.lastIndexOf("."))}.webp`);
		} else {
			return express.static(`${__dirname}/public/${req.params.type}`, { maxAge: 86400000 })(req, res, next);
		}
	});

	// Listen for incoming connections
	const { server, httpsServer } = await listen(configJS);

	// Setup socket.io for dashboard
	const io = app.io = sio(typeof httpsServer !== "undefined" ? httpsServer : server);
	io.use(passportSocketIo.authorize({
		key: "connect.sid",
		secret: configJS.secret,
		store: sessionStore,
		passport,
	}));

	client.IPC.on("dashboardUpdate", msg => {
		const namespace = msg.namespace;
		const param = msg.location;
		try {
			io.of(namespace).emit("update", param);
			if (param === "maintainer") global.configJSON = reload("../Configurations/config.json");
		} catch (err) {
			winston.warn("An error occurred while handling a dashboard WebSocket!", err);
		}
	});

	require("./routes")(app);
	return { server, httpsServer };
	/* eslint-disable */
	/*

	// Maintainer console maintainers
	app.get("/dashboard/maintainer/management/maintainers", (req, res) => {
		checkAuth(req, res, async consolemember => {
			res.render("pages/maintainer-maintainers.ejs", {
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				serverData: {
					name: bot.user.username,
					id: bot.user.id,
					icon: bot.user.avatarURL() || "/static/img/discord-icon.png",
					isMaintainer: true,
					isSudoMaintainer: configJSON.sudoMaintainers.includes(consolemember.id),
					isHost: process.env.GAB_HOST === consolemember.id,
					accessAdmin: checkPerms("/dashboard/global-options", consolemember.id),
					accessManagement: checkPerms("/dashboard/management", consolemember.id),
					accessEval: checkPerms("/dashboard/management/eval", consolemember.id),
				},
				currentPage: `${req.baseUrl}${req.path}`,
				config: {
					maintainers: await Promise.all(configJSON.maintainers.map(async id => {
						const usr = await bot.users.fetch(id, true) || {
							id: "invalid-user",
							username: "invalid-user",
						};
						return {
							name: usr.username,
							id: usr.id,
							avatar: usr.avatarURL() || "/static/img/discord-icon.png",
							isSudoMaintainer: configJSON.sudoMaintainers.includes(usr.id),
						};
					})),
					perms: configJSON.perms,
				},
			});
		});
	});
	io.of("/dashboard/management/maintainers").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/maintainer/management/maintainers", (req, res) => {
		checkAuth(req, res, async consolemember => {
			if (req.body["new-user"]) {
				let usr = await db.users.findOne({ username: req.body["new-user"]}).exec();
				if (!usr) usr = await bot.users.fetch(req.body["new-user"], true);
				if (!usr.id) usr.id = usr._id;
				if (usr && configJSON.maintainers.indexOf(usr.id) === -1) {
					configJSON.maintainers.push(usr.id);
				}
				if (usr && req.body[`isSudo`] === "true" && !configJSON.sudoMaintainers.includes(usr.id)) {
					configJSON.sudoMaintainers.push(usr.id);
				}
			} else if (configJSON.sudoMaintainers.includes(consolemember.id)) {
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
					if (configJSON.perms[perm] === 0 && process.env.GAB_HOST !== consolemember.id) return;
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

			if (req.body["additional-perms"]) return saveMaintainerConsoleOptions(consolemember, req, res, true);
			saveMaintainerConsoleOptions(consolemember, req, res);
		});
	});

	// Maintainer console bot version
	app.get("/dashboard/maintainer/management/version", (req, res) => {
		checkAuth(req, res, async () => {
			let version = await Updater.check();
			if (version.latest) version.latest.config.changelog = md.makeHtml(version.latest.config.changelog);
			res.render("pages/maintainer-version.ejs", {
				disabled: version === 404,
				version: configJSON.version,
				branch: configJSON.branch,
				latestVersion: version.latest ? JSON.stringify(version.latest) : undefined,
				utd: version["up-to-date"],
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				serverData: {
					name: bot.user.username,
					id: bot.user.id,
					icon: bot.user.avatarURL() || "/static/img/discord-icon.png",
					isMaintainer: true,
					isSudoMaintainer: configJSON.sudoMaintainers.includes(req.user.id),
					accessAdmin: checkPerms("/dashboard/global-options", req.user.id),
					accessManagement: checkPerms("/dashboard/management", req.user.id),
					accessEval: checkPerms("/dashboard/management/eval", req.user.id),
				},
				currentPage: `${req.baseUrl}${req.path}`,
			});
		});
	});
	app.post("/dashboard/maintainer/management/version", (req, res) => {
		checkAuth(req, res, () => {
			io.of("/dashboard/management/version").on("connection", socket => {
				socket.on("update", data => {
					if (data === "start") {
						socket.emit("update", "prepare");
						Updater.update(bot, configJSON, socket, winston);
					}
				});
				socket.on("disconnect", () => {
					if (socket.isUpdateFinished) return;
					winston.error("Lost connection to Updater client. Shutting down GAB in an attempt to resync states (⇀‸↼‶)");
					bot.IPC.send("shutdown", { err: true });
				});
			});
			res.sendStatus(200);
		});
	});

	// Maintainer console evaluate code
	app.get("/dashboard/maintainer/management/eval", (req, res) => {
		checkAuth(req, res, async consolemember => {
			res.render("pages/maintainer-eval.ejs", {
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				serverData: {
					name: bot.user.username,
					id: bot.user.id,
					icon: bot.user.avatarURL() || "/static/img/discord-icon.png",
					isMaintainer: true,
					isSudoMaintainer: configJSON.sudoMaintainers.includes(consolemember.id),
					accessAdmin: checkPerms("/dashboard/global-options", consolemember.id),
					accessManagement: checkPerms("/dashboard/management", consolemember.id),
					accessEval: checkPerms("/dashboard/management/eval", req.user.id),
				},
				currentPage: `${req.baseUrl}${req.path}`,
				config: {
					shardTotal: Number(process.env.SHARD_COUNT),
				},
			});
		});
	});
	app.post("/dashboard/maintainer/management/eval", (req, res) => {
		checkAuth(req, res, async consolemember => {
			if (req.body.code && req.body.target) {
				bot.IPC.send("evaluate", { code: req.body.code, target: req.body.target }).then(result => {
					res.send(JSON.stringify(result));
				});
				winston.info(`Maintainer ${consolemember.username} executed JavaScript from the Maintainer Console!`, { maintainer: consolemember.id, code: req.body.code, target: req.body.target });
			} else {
				res.sendStatus(400);
			}
		});
	});

	// Maintainer console shard data
	app.get("/dashboard/maintainer/management/shards", (req, res) => {
		checkAuth(req, res, async consolemember => {
			let data = await bot.IPC.send("shardData", {});
			res.render("pages/maintainer-shards.ejs", {
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				serverData: {
					name: bot.user.username,
					id: bot.user.id,
					icon: bot.user.avatarURL() || "/static/img/discord-icon.png",
					isMaintainer: true,
					isSudoMaintainer: configJSON.sudoMaintainers.includes(consolemember.id),
					accessAdmin: checkPerms("/dashboard/global-options", consolemember.id),
					accessManagement: checkPerms("/dashboard/management", consolemember.id),
					accessEval: checkPerms("/dashboard/management/eval", consolemember.id),
					accessShutdown: checkPerms("shutdown", consolemember.id),
				},
				currentPage: `${req.baseUrl}${req.path}`,
				config: {
					shardTotal: Number(process.env.SHARD_COUNT),
					currentShard: bot.shardID,
					data,
				},
			});
		});
	});
	app.post("/dashboard/maintainer/management/shards", (req, res) => {
		checkAuth(req, res, async consolemember => {
			if (!checkPerms("shutdown", consolemember.id)) return res.sendStatus(403);
			if (req.body["dismiss"]) {
				await bot.IPC.send("dismissWarning", { warning: req.body["dismiss"] });
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
			if (req.body["restart"] === "master") {
				bot.IPC.send("shutdown", { err: false, soft: true });
			}
			if (req.body["shutdown"] === "master") {
				bot.IPC.send("shutdown", { err: false });
			}
		});
	});

	// Maintainer console console logs
	app.get("/dashboard/maintainer/management/logs", (req, res) => {
		checkAuth(req, res, () => {
			winston.transports.file.query({ limit: 10 }, (err, results) => {
				results.reverse();
				let logs = results.map(log => {
					log.timestamp = moment(log.timestamp).format("DD-MM-YYYY HH:mm:ss");
					return log;
				});
				res.render("pages/maintainer-logs.ejs", {
					authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
					serverData: {
						name: bot.user.username,
						id: bot.user.id,
						icon: bot.user.avatarURL() || "/static/img/discord-icon.png",
						isMaintainer: true,
						isSudoMaintainer: configJSON.sudoMaintainers.includes(req.user.id),
						accessAdmin: checkPerms("/dashboard/global-options", req.user.id),
						accessManagement: checkPerms("/dashboard/management", req.user.id),
						accessEval: checkPerms("/dashboard/management/eval", req.user.id),
					},
					currentPage: `${req.baseUrl}${req.path}`,
					logs: JSON.stringify(logs),
				});
			});
		});
	});
	io.of("/dashboard/management/logs").on("connection", async socket => {
		const send = data => {
			data.timestamp = moment(data.timestamp).format("DD-MM-YYYY HH:mm:ss");
			socket.emit("logs", data);
		};
		// We have to use this cheat because winston's unsupported af and its stream method's start parameter does *not* work as documented.
		// So keep your logs clean, people! You don't want this to go over thousands of lines. Luckily, the page is already rendered when we execute the query, it's just the WebSocket that's delayed.
		let l = (await fsn.readFile("./logs/verbose.gawesomebot.log", "utf8")).split(/\n+/).length;
		let stream = winston.transports.file.stream({ start: l - 2 }).on("log", send);
		socket.on("disconnect", () => stream.destroy());
	});

	// Handle errors (redirect to error page)
	app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
		winston.warn(`An error occurred during a ${req.protocol} ${req.method} request on ${req.path} 0.0\n`, error, { params: req.params, query: req.query });
		renderError(res, "An unexpected and unknown error occurred!<br>Please contact your GAB maintainer for support.");
	});
	*/
};

exports.close = (servers) => {
	if (typeof servers.forEach !== "function") servers = Object.values(servers);
	winston.info("Closing Web Interface...");
	servers.forEach(server => server.close());
	winston.warn("This shard is no longer hosting a Web Interface.");
};
