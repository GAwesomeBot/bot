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

	// Maintainer console bot version
	app.get("/dashboard/maintainer/management/version", (req, res) => {
	});
	app.post("/dashboard/maintainer/management/version", (req, res) => {
		checkAuth(req, res, () => {

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
		});
	});
	app.post("/dashboard/maintainer/management/shards", (req, res) => {
		checkAuth(req, res, async consolemember => {

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
