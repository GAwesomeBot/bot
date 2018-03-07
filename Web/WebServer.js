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
const path = require("path");
const fs = require("fs");
const fsn = require("fs-nextra");
const sizeof = require("object-sizeof");

const reload = require("require-reload")(require);

const Utils = require("../Modules").Utils;
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
		httpsServer.on("error", (err) => {
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
module.exports.open = async (bot, auth, configJS, winston) => {
	// Setup Express App object
	app.bot = app.client = bot;
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

	bot.IPC.on("dashboardUpdate", msg => {
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
	const checkAuth = async (req, res, next, api) => {
		if (req.isAuthenticated()) {
			const usr = await bot.users.fetch(req.user.id, true);
			if (usr) {
				if (!req.params.svrid && req.query.svrid) req.params.svrid = req.query.svrid;
				if (!req.params.svrid) {
					if (checkPerms(req.path, usr.id, "maintainer")) {
						try {
							next(usr);
						} catch (err) {
							winston.warn(`An error occurred during a ${req.protocol} ${req.method} request on ${req.path} 0.0\n`, { params: req.params, query: req.query }, err);
							renderError(res, "An unknown error occurred.")
						}
					} else deny(res, api);
				} else {
					const svr = await getGuild.get(bot, req.params.svrid, {
							resolve: ["id", "ownerID", "name", "icon"],
							members: ["id", "roles", "user", "nickname"],
							channels: ["id", "type", "name", "position", "rawPosition"],
							roles: ["name", "id", "position", "hexColor"],
							convert: { id_only: true },
						});
					if (svr && usr) {
						db.servers.findOne({ _id: svr.id }, (err, serverDocument) => {
							if (!err && serverDocument) {
								const member = svr.members[usr.id];
								const adminLevel = bot.getUserBotAdmin(svr, serverDocument, member);
								if (adminLevel >= 3 || checkPerms(req.path, usr.id, req.params.svrid)) {
									try {
										next(member, svr, serverDocument, adminLevel);
									} catch (err) {
										winston.warn(`An error occurred during a ${req.protocol} ${req.method} request on ${req.path} 0.0\n`, { params: req.params, query: req.query }, err);
										if (api) return res.sendStatus(500);
										renderError(res, "An unknown error occurred.")
									}
								} else {
									if (api) return res.sendStatus(403);
									res.redirect("/dashboard");
								}
							} else {
								if (api) return res.sendStatus(500);
								renderError(res, "Something went wrong while fetching your server data.");
							}
						});
					} else {
						if (api) return res.sendStatus(404);
						renderError(res, "Wait a second, that server doesn't exist!<br>We failed to fetch your server from Discord.");
					}
				}
			} else {
				if (api) return res.sendStatus(500);
				renderError(res, "Wait, do you exist?<br>We failed to fetch your user from Discord.");
			}
		} else {
			if (api) return res.sendStatus(401);
			res.redirect("/login");
		}
	};

	// Admin console overview (home)
	app.get("/dashboard/:svrid/overview", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {

		});
	});

	// Admin console command options
	app.get("/dashboard/:svrid/commands/command-options", (req, res) => {
		checkAuth(req, res, async (consolemember, svr, serverDocument, adminLvl) => {

		});
	});
	io.of("/dashboard/commands/command-options").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/commands/command-options", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {

		});
	});

	// Admin console command list
	app.get("/dashboard/:svrid/commands/command-list", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			const commandDescriptions = {};
			const commandCategories = {};
			bot.getPublicCommandList().forEach(command => {
				const commandData = bot.getPublicCommandMetadata(command);
				commandDescriptions[command] = commandData.description;
				commandCategories[command] = commandData.category;
			});
			res.render("pages/admin-command-list.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					commands: serverDocument.toObject().config.commands,
				},
				commandDescriptions,
				commandCategories,
			});
		});
	});
	io.of("/dashboard/commands/command-list").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	const parseCommandOptions = (svr, serverDocument, command, data) => {
		const commandData = bot.getPublicCommandMetadata(command);
		if (commandData) {
			if (!serverDocument.config.commands[command]) {
				serverDocument.config.commands[command] = {};
			}
			if (commandData.defaults.adminLevel < 4) {
				serverDocument.config.commands[command].isEnabled = data[`${command}-isEnabled`] === "on";
				serverDocument.config.commands[command].admin_level = data[`${command}-adminLevel`] || 0;
				serverDocument.config.commands[command].disabled_channel_ids = [];
				Object.values(svr.channels).forEach(ch => {
					if (ch.type === "text") {
						if (!data[`${command}-disabled_channel_ids-${ch.id}`]) {
							serverDocument.config.commands[command].disabled_channel_ids.push(ch.id);
						}
					}
				});
			}
		}
	};
	app.post("/dashboard/:svrid/commands/command-list", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["preset-applied"]) {
				const disabled_channel_ids = [];
				Object.values(svr.channels).forEach(ch => {
					if (ch.type === "text") {
						if (!req.body[`preset-disabled_channel_ids-${ch.id}`]) {
							disabled_channel_ids.push(ch.id);
						}
					}
				});
				for (const command in serverDocument.toObject().config.commands) {
					if (!serverDocument.config.commands[command]) continue;
					serverDocument.config.commands[command].admin_level = req.body["preset-admin_level"] || 0;
					serverDocument.config.commands[command].disabled_channel_ids = disabled_channel_ids;
				}
			} else {
				for (const command in serverDocument.toObject().config.commands) {
					parseCommandOptions(svr, serverDocument, command, req.body);
				}
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console RSS feeds
	app.get("/dashboard/:svrid/commands/rss-feeds", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-rss-feeds.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					rss_feeds: serverDocument.config.rss_feeds,
					commands: {
						rss: serverDocument.config.commands.rss,
						trivia: {
							isEnabled: serverDocument.config.commands.trivia ? serverDocument.config.commands.trivia.isEnabled : null,
						},
					},
				},
				commandDescriptions: {
					rss: bot.getPublicCommandMetadata("rss").description,
				},
				commandCategories: {
					rss: bot.getPublicCommandMetadata("rss").category,
				},
			});
		});
	});
	io.of("/dashboard/commands/rss-feeds").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/commands/rss-feeds", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["new-url"] && req.body["new-name"] && !serverDocument.config.rss_feeds.id(req.body["new-name"])) {
				serverDocument.config.rss_feeds.push({
					_id: req.body["new-name"],
					url: req.body["new-url"],
				});
			} else {
				parseCommandOptions(svr, serverDocument, "rss", req.body);
				for (let i = 0; i < serverDocument.config.rss_feeds.length; i++) {
					if (req.body[`rss-${serverDocument.config.rss_feeds[i]._id}-removed`]) {
						serverDocument.config.rss_feeds[i] = null;
					} else {
						serverDocument.config.rss_feeds[i].streaming.isEnabled = req.body[`rss-${serverDocument.config.rss_feeds[i]._id}-streaming-isEnabled`] === "on";
						serverDocument.config.rss_feeds[i].streaming.enabled_channel_ids = [];
						Object.values(svr.channels).forEach(ch => {
							if (ch.type === "text") {
								if (req.body[`rss-${serverDocument.config.rss_feeds[i]._id}-streaming-enabled_channel_ids-${ch.id}`] === "on") {
									serverDocument.config.rss_feeds[i].streaming.enabled_channel_ids.push(ch.id);
								}
							}
						});
					}
				}
				serverDocument.config.rss_feeds.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console streamers
	app.get("/dashboard/:svrid/commands/streamers", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-streamers.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					streamers_data: serverDocument.config.streamers_data,
					commands: {
						streamers: serverDocument.config.commands.streamers,
						trivia: {
							isEnabled: serverDocument.config.commands.trivia.isEnabled,
						},
					},
				},
				commandDescriptions: {
					streamers: bot.getPublicCommandMetadata("streamers").description,
				},
				commandCategories: {
					streamers: bot.getPublicCommandMetadata("streamers").category,
				},
			});
		});
	});
	io.of("/dashboard/commands/streamers").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/commands/streamers", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["new-name"] && req.body["new-type"] && !serverDocument.config.streamers_data.id(req.body["new-name"])) {
				serverDocument.config.streamers_data.push({
					_id: req.body["new-name"],
					type: req.body["new-type"],
				});
			} else {
				parseCommandOptions(svr, serverDocument, "streamers", req.body);
				for (let i = 0; i < serverDocument.config.streamers_data.length; i++) {
					if (req.body[`streamer-${serverDocument.config.streamers_data[i]._id}-removed`]) {
						serverDocument.config.streamers_data[i] = null;
					} else {
						serverDocument.config.streamers_data[i].channel_id = req.body[`streamer-${serverDocument.config.streamers_data[i]._id}-channel_id`];
					}
				}
				serverDocument.config.streamers_data.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console tags
	app.get("/dashboard/:svrid/commands/tags", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			const data = {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					tags: serverDocument.config.tags,
					commands: {
						tag: serverDocument.config.commands.tag,
						trivia: {
							isEnabled: serverDocument.config.commands.trivia.isEnabled,
						},
					},
				},
				commandDescriptions: {
					tag: bot.getPublicCommandMetadata("tag").description,
				},
				commandCategories: {
					tag: bot.getPublicCommandMetadata("tag").category,
				},
			};

			const cleanTag = content => {
				let cleanContent = "";
				while (content.indexOf("<") > -1) {
					cleanContent += content.substring(0, content.indexOf("<"));
					content = content.substring(content.indexOf("<") + 1);
					if (content && content.indexOf(">") > 1) {
						const type = content.charAt(0);
						const id = content.substring(1, content.indexOf(">"));
						if (!isNaN(id)) {
							if (type === "@") {
								const usr = svr.members[id];
								if (usr) {
									cleanContent += `<b>@${usr.username}</b>`;
									content = content.substring(content.indexOf(">") + 1);
									continue;
								}
							} else if (type === "#") {
								const ch = svr.channels[id];
								if (ch) {
									cleanContent += `<b>#${ch.name}</b>`;
									content = content.substring(content.indexOf(">") + 1);
									continue;
								}
							}
						}
					}
					cleanContent += "<";
				}
				cleanContent += content;
				return cleanContent;
			};

			for (let i = 0; i < data.configData.tags.list.length; i++) {
				data.configData.tags.list[i].content = cleanTag(data.configData.tags.list[i].content);
				data.configData.tags.list[i].index = i;
			}
			data.configData.tags.list.sort((a, b) => a._id.localeCompare(b._id));
			res.render("pages/admin-tags.ejs", data);
		});
	});
	io.of("/dashboard/commands/tags").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/commands/tags", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["new-name"] && req.body["new-type"] && req.body["new-content"] && !serverDocument.config.tags.list.id(req.body["new-name"])) {
				serverDocument.config.tags.list.push({
					_id: req.body["new-name"],
					content: req.body["new-content"],
					isCommand: req.body["new-type"] === "command",
				});
			} else {
				parseCommandOptions(svr, serverDocument, "tag", req.body);
				serverDocument.config.tags.listIsAdminOnly = req.body.listIsAdminOnly === "true";
				serverDocument.config.tags.addingIsAdminOnly = req.body.addingIsAdminOnly === "true";
				serverDocument.config.tags.addingCommandIsAdminOnly = req.body.addingCommandIsAdminOnly === "true";
				serverDocument.config.tags.removingIsAdminOnly = req.body.removingIsAdminOnly === "true";
				serverDocument.config.tags.removingCommandIsAdminOnly = req.body.removingCommandIsAdminOnly === "true";
				for (let i = 0; i < serverDocument.config.tags.list.length; i++) {
					if (req.body[`tag-${i}-removed`]) {
						serverDocument.config.tags.list[i] = null;
					} else {
						serverDocument.config.tags.list[i].isCommand = req.body[`tag-${i}-isCommand`] === "command";
						serverDocument.config.tags.list[i].isLocked = req.body[`tag-${i}-isLocked`] === "on";
					}
				}
				serverDocument.config.tags.list.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console auto translation
	app.get("/dashboard/:svrid/commands/auto-translation", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			const data = {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					translated_messages: serverDocument.config.translated_messages,
					commands: {
						trivia: {
							isEnabled: serverDocument.config.commands.trivia.isEnabled,
						},
					},
				},
			};
			for (let i = 0; i < data.configData.translated_messages.length; i++) {
				const member = svr.members[data.configData.translated_messages[i]._id] || {};
				data.configData.translated_messages[i].username = member.user.username;
				data.configData.translated_messages[i].avatar = bot.getAvatarURL(member.id, member.user.avatar) || "/static/img/discord-icon.png";
			}
			res.render("pages/admin-auto-translation.ejs", data);
		});
	});
	io.of("/dashboard/commands/auto-translation").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/commands/auto-translation", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["new-member"] && req.body["new-source_language"]) {
				const member = findQueryUser(req.body["new-member"], svr.members);
				if (member && !serverDocument.config.translated_messages.id(member.id)) {
					const enabled_channel_ids = [];
					Object.values(svr.channels).forEach(ch => {
						if (ch.type === "text") {
							if (req.body[`new-enabled_channel_ids-${ch.id}`] === "true") {
								enabled_channel_ids.push(ch.id);
							}
						}
					});
					serverDocument.config.translated_messages.push({
						_id: member.id,
						source_language: req.body["new-source_language"],
						enabled_channel_ids: enabled_channel_ids,
					});
				}
			} else {
				for (let i = 0; i < serverDocument.config.translated_messages.length; i++) {
					if (req.body[`translated_messages-${i}-removed`]) {
						serverDocument.config.translated_messages[i] = null;
					} else {
						serverDocument.config.translated_messages[i].enabled_channel_ids = [];
						Object.values(svr.channels).forEach(ch => {
							if (ch.type === "text") {
								if (req.body[`translated_messages-${i}-enabled_channel_ids-${ch.id}`] === "on") {
									serverDocument.config.translated_messages[i].enabled_channel_ids.push(ch.id);
								}
							}
						});
					}
				}
				serverDocument.config.translated_messages.spliceNullElements();
			}
			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console trivia sets
	app.get("/dashboard/:svrid/commands/trivia-sets", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.query.i) {
				const triviaSetDocument = serverDocument.config.trivia_sets[req.query.i];
				if (triviaSetDocument) {
					res.json(triviaSetDocument.items);
				} else {
					renderError(res, "Are you sure that trivia set exists?", null, 404);
				}
			} else {
				res.render("pages/admin-trivia-sets.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
          sudo: adminLvl !== 3,
					serverData: {
						name: svr.name,
						id: svr.id,
						icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
					},
					currentPage: `${req.baseUrl}${req.path}`,
					configData: {
						trivia_sets: serverDocument.config.trivia_sets,
						commands: {
							trivia: {
								isEnabled: serverDocument.config.commands.trivia.isEnabled,
							},
						},
					},
				});
			}
		});
	});
	io.of("/dashboard/commands/trivia-sets").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/commands/trivia-sets", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["new-name"] && req.body["new-items"] && !serverDocument.config.trivia_sets.id(req.body["new-name"])) {
				try {
					serverDocument.config.trivia_sets.push({
						_id: req.body["new-name"],
						items: JSON.parse(req.body["new-items"]),
					});
				} catch (err) {
					renderError(res, "That doesn't look like valid JSON to me!", null, 400);
					return;
				}
			} else {
				for (let i = 0; i < serverDocument.config.trivia_sets.length; i++) {
					if (req.body[`trivia_set-${i}-removed`]) {
						serverDocument.config.trivia_sets[i] = null;
					}
				}
				serverDocument.config.trivia_sets.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console API keys
	app.get("/dashboard/:svrid/commands/api-keys", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-api-keys.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					custom_api_keys: serverDocument.config.custom_api_keys || {},
				},
			});
		});
	});
	io.of("/dashboard/commands/api-keys").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/commands/api-keys", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			serverDocument.config.custom_api_keys.google_api_key = req.body.google_api_key;
			serverDocument.config.custom_api_keys.google_cse_id = req.body.google_cse_id;

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console tag reaction
	app.get("/dashboard/:svrid/commands/tag-reaction", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-tag-reaction.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					tag_reaction: serverDocument.config.tag_reaction,
				},
			});
		});
	});
	io.of("/dashboard/commands/tag-reaction").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/commands/tag-reaction", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["new-message"] && req.body["new-message"].length <= 2000) {
				serverDocument.config.tag_reaction.messages.push(req.body["new-message"]);
			} else {
				serverDocument.config.tag_reaction.isEnabled = req.body.isEnabled === "on";
				for (let i = 0; i < serverDocument.config.tag_reaction.messages.length; i++) {
					if (req.body[`tag_reaction-${i}-removed`]) {
						serverDocument.config.tag_reaction.messages[i] = null;
					}
				}
				serverDocument.config.tag_reaction.messages.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console stats collection
	app.get("/dashboard/:svrid/stats-points/stats-collection", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-stats-collection.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					commands: {
						games: serverDocument.config.commands.games,
						messages: serverDocument.config.commands.messages,
						stats: serverDocument.config.commands.stats,
					},
				},
				commandDescriptions: {
					games: bot.getPublicCommandMetadata("games").description,
					messages: bot.getPublicCommandMetadata("messages").description,
					stats: bot.getPublicCommandMetadata("stats").description,
				},
				commandCategories: {
					games: bot.getPublicCommandMetadata("games").category,
					messages: bot.getPublicCommandMetadata("messages").category,
					stats: bot.getPublicCommandMetadata("stats").category,
				},
			});
		});
	});
	io.of("/dashboard/stats-points/stats-collection").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/stats-points/stats-collection", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			parseCommandOptions(svr, serverDocument, "stats", req.body);
			parseCommandOptions(svr, serverDocument, "games", req.body);
			parseCommandOptions(svr, serverDocument, "messages", req.body);

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console ranks
	app.get("/dashboard/:svrid/stats-points/ranks", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-ranks.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					ranks_list: serverDocument.config.ranks_list.map(a => {
						a.members = serverDocument.members.filter(memberDocument => memberDocument.rank === a._id).length;
						return a;
					}),
				},
			});
		});
	});
	io.of("/dashboard/stats-points/ranks").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/stats-points/ranks", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["new-name"] && req.body["new-max_score"] && !serverDocument.config.ranks_list.id(req.body["new-name"])) {
				serverDocument.config.ranks_list.push({
					_id: req.body["new-name"],
					max_score: req.body["new-max_score"],
					role_id: req.body["new-role_id"] || null,
				});
			} else {
				for (let i = 0; i < serverDocument.config.ranks_list.length; i++) {
					if (req.body[`rank-${i}-removed`]) {
						serverDocument.config.ranks_list[i] = null;
					} else {
						serverDocument.config.ranks_list[i].max_score = parseInt(req.body[`rank-${i}-max_score`]);
						if (serverDocument.config.ranks_list[i].role_id || req.body[`rank-${i}-role_id`]) {
							serverDocument.config.ranks_list[i].role_id = req.body[`rank-${i}-role_id`];
						}
					}
				}
				if (req.body["ranks_list-reset"]) {
					for (let i = 0; i < serverDocument.members.length; i++) {
						if (serverDocument.members[i].rank && serverDocument.members[i].rank !== serverDocument.config.ranks_list[0]._id) {
							serverDocument.members[i].rank = serverDocument.config.ranks_list[0]._id;
						}
					}
				}
			}
			serverDocument.config.ranks_list.spliceNullElements();
			serverDocument.config.ranks_list = serverDocument.config.ranks_list.sort((a, b) => a.max_score - b.max_score);

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console GAwesomePoints
	app.get("/dashboard/:svrid/stats-points/gawesome-points", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-gawesome-points.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					commands: {
						points: serverDocument.config.commands.points,
						lottery: serverDocument.config.commands.lottery,
					},
				},
				commandDescriptions: {
					points: bot.getPublicCommandMetadata("points").description,
					lottery: bot.getPublicCommandMetadata("lottery").description,
				},
				commandCategories: {
					points: bot.getPublicCommandMetadata("points").category,
					lottery: bot.getPublicCommandMetadata("lottery").category,
				},
			});
		});
	});
	io.of("/dashboard/stats-points/gawesome-points").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/stats-points/gawesome-points", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			parseCommandOptions(svr, serverDocument, "points", req.body);
			parseCommandOptions(svr, serverDocument, "lottery", req.body);

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console admins
	app.get("/dashboard/:svrid/administration/admins", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {

		});
	});
	io.of("/dashboard/administration/admins").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/administration/admins", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {

		});
	});

	// Admin console moderation
	app.get("/dashboard/:svrid/administration/moderation", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-moderation.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
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
		});
	});
	io.of("/dashboard/administration/moderation").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/administration/moderation", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			serverDocument.config.moderation.isEnabled = req.body.isEnabled === "on";
			serverDocument.config.moderation.autokick_members.isEnabled = req.body["autokick_members-isEnabled"] === "on";
			serverDocument.config.moderation.autokick_members.max_inactivity = parseInt(req.body["autokick_members-max_inactivity"]);
			serverDocument.config.moderation.new_member_roles = [];
			Object.values(svr.roles).forEach(role => {
				if (role.name !== "@everyone" && role.name.indexOf("color-") !== 0) {
					if (req.body[`new_member_roles-${role.id}`] === "on") {
						serverDocument.config.moderation.new_member_roles.push(role.id);
					}
				}
			});
			serverDocument.modlog.isEnabled = req.body["modlog-isEnabled"] === "on";
			serverDocument.modlog.channel_id = req.body["modlog-channel_id"];

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console blocked
	app.get("/dashboard/:svrid/administration/blocked", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-blocked.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					blocked: Object.values(svr.members).filter(member => serverDocument.config.blocked.indexOf(member.id) > -1).map(member => ({
						name: member.user.username,
						id: member.id,
						avatar: bot.getAvatarURL(member.id, member.user.avatar) || "/static/img/discord-icon.png",
					})).concat(configJSON.userBlocklist.filter(usrid => svr.members.hasOwnProperty(usrid)).map(usrid => {
						const member = svr.members[usrid];
						return {
							name: member.user.username,
							id: member.id,
							avatar: bot.getAvatarURL(member.id, member.user.avatar) || "/static/img/discord-icon.png",
							isGlobal: true,
						};
					})),
					moderation: {
						isEnabled: serverDocument.config.moderation.isEnabled,
					},
				},
			});
		});
	});
	io.of("/dashboard/administration/blocked").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/administration/blocked", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["new-member"]) {
				const member = findQueryUser(req.body["new-member"], svr.members);
				if (member && serverDocument.config.blocked.indexOf(member.id) === -1 && bot.getUserBotAdmin(svr, serverDocument, member) === 0) {
					serverDocument.config.blocked.push(member.id);
				}
			} else {
				for (let i = 0; i < serverDocument.config.blocked.length; i++) {
					if (req.body[`block-${i}-removed`] !== undefined) {
						serverDocument.config.blocked[i] = null;
					}
				}
				serverDocument.config.blocked.spliceNullElements();
			}
			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console muted
	app.get("/dashboard/:svrid/administration/muted", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			const mutedMembers = serverDocument.members.filter(memberDocument => memberDocument.muted && memberDocument.muted.length > 0 && svr.members.hasOwnProperty(memberDocument._id))
				.map(memberDocument => {
					const member = svr.members[memberDocument._id];
					return {
						name: member.user.username,
						id: member.id,
						avatar: bot.getAvatarURL(member.id, member.user.avatar),
						channels: memberDocument.muted.map(memberMutedDocument => memberMutedDocument._id),
					}
				});
			mutedMembers.sort((a, b) => a.name.localeCompare(b.name));
			res.render("pages/admin-muted.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons"),
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
		});
	});
	io.of("/dashboard/administration/muted").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/administration/muted", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["new-member"] && req.body["new-channel_id"]) {
				const member = findQueryUser(req.body["new-member"], svr.members);
				const ch = svr.channels[req.body["new-channel_id"]];

				let memberDocument = serverDocument.members.id(member.id);
				if (!memberDocument) {
					serverDocument.members.push({ _id: member.id });
					memberDocument = serverDocument.members.id(member.id);
				}

				if (member && bot.getUserBotAdmin(svr, serverDocument, member) === 0 && ch && !memberDocument.muted.id(ch.id)) {
					bot.IPC.send("muteMember", { guild: svr.id, channel: ch.id, member: member.id });
					memberDocument.muted.push({ _id: ch.id });
				}
			} else {
				let memberDocuments = serverDocument.members;
				Object.keys(req.body).forEach(key => {
					const parameters = key.split("-");
					if (parameters.length === 3 && parameters[0] === "muted" && svr.members.hasOwnProperty(parameters[1]) && memberDocuments.id(parameters[1])) {
						const memberDocument = memberDocuments.id(parameters[1]);
						if (parameters[2] === "removed") {
							// Muted member removed
							for (let memberMutedDocument of memberDocument.muted) {
								bot.IPC.send("unmuteMember", { guild: svr.id, channel: memberMutedDocument._id, member: parameters[1] });
							}
							memberDocument.muted = [];
						} else if (svr.channels.hasOwnProperty(parameters[2]) && req.body[key] === "on" && !memberDocument.muted.id(parameters[2])) {
							// Muted member new channels
							bot.IPC.send("muteMember", { guild: svr.id, channel: parameters[2], member: parameters[1] });
							memberDocument.muted.push({ _id: parameters[2] });
						}
					}
				});
				// Muted members channels removed
				memberDocuments = serverDocument.members.filter(member => member.muted && member.muted.length > 0 && svr.members.hasOwnProperty(member._id));
				memberDocuments.forEach(memberDocument => {
					memberDocument.muted.forEach(memberMutedDocument => {
						if (!req.body[`muted-${memberDocument._id}-${memberMutedDocument._id}`]) {
							bot.IPC.send("unmuteMember", { guild: svr.id, channel: memberMutedDocument._id, member: memberDocument._id });
							memberDocument.muted.pull(memberMutedDocument._id);
						}
					});
				});
			}
			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console strikes
	app.get("/dashboard/:svrid/administration/strikes", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-strikes.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					moderation: {
						isEnabled: serverDocument.config.moderation.isEnabled,
					},
				},
				strikes: serverDocument.members.filter(memberDocument => svr.members.hasOwnProperty(memberDocument._id) && memberDocument.strikes.length > 0).map(memberDocument => {
					const member = svr.members[memberDocument._id];
					return {
						name: member.user.username,
						id: member.id,
						avatar: bot.getAvatarURL(member.id, member.user.avatar) || "/static/img/discord-icon.png",
						strikes: memberDocument.strikes.map(strikeDocument => {
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
									id: creator.id,
									avatar: bot.getAvatarURL(creator.id, creator.user.avatar) || "/static/img/discord-icon.png",
								},
								reason: md.makeHtml(xssFilters.inHTMLData(strikeDocument.reason)),
								rawDate: moment(strikeDocument.timestamp).format(configJS.moment_date_format),
								relativeDate: moment(strikeDocument.timestamp).fromNow(),
							};
						}),
					};
				}),
			});
		});
	});
	io.of("/dashboard/administration/strikes").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/administration/strikes", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["new-member"] && req.body["new-reason"]) {
				const member = findQueryUser(req.body["new-member"], svr.members);
				if (member && bot.getUserBotAdmin(svr, serverDocument, member) === 0) {
					let memberDocument = serverDocument.members.id(member.id);
					if (!memberDocument) {
						serverDocument.members.push({ _id: member.id });
						memberDocument = serverDocument.members.id(member.id);
					}
					memberDocument.strikes.push({
						_id: consolemember.id,
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

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console status messages
	app.get("/dashboard/:svrid/administration/status-messages", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			const statusMessagesData = serverDocument.toObject().config.moderation.status_messages;
			for (let i = 0; i < statusMessagesData.member_streaming_message.enabled_user_ids.length; i++) {
				const member = svr.members[statusMessagesData.member_streaming_message.enabled_user_ids[i]] || { user: {} };
				statusMessagesData.member_streaming_message.enabled_user_ids[i] = {
					name: member.user.username,
					id: member.id,
					avatar: bot.getAvatarURL(member.id, member.user.avatar) || "/static/img/discord-icon.png",
				};
			}
			res.render("pages/admin-status-messages.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
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
		});
	});
	io.of("/dashboard/administration/status-messages").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/administration/status-messages", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			const args = Object.keys(req.body)[0].split("-");
			if (Object.keys(req.body).length === 1 && args[0] === "new" && serverDocument.config.moderation.status_messages[args[1]] && args[2] === "message") {
				if (args[1] === "member_streaming_message") {
					const member = findQueryUser(req.body[Object.keys(req.body)[0]], svr.members);
					if (member && serverDocument.config.moderation.status_messages[args[1]].enabled_user_ids.indexOf(member.id) === -1) {
						serverDocument.config.moderation.status_messages[args[1]].enabled_user_ids.push(member.id);
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
					if (Object.keys(req.body).length > 1) for (const key in serverDocument.toObject().config.moderation.status_messages[status_message]) {
						switch (key) {
							case "isEnabled":
								serverDocument.config.moderation.status_messages[status_message][key] = req.body[`${status_message}-${key}`] === "on";
								break;
							case "enabled_channel_ids":
								serverDocument.config.moderation.status_messages[status_message][key] = [];
								Object.values(svr.channels).forEach(ch => {
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
							case "type":
								serverDocument.config.moderation.status_messages[status_message][key] = req.body[`${status_message}-${key}`];
								break;
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

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console filters
	app.get("/dashboard/:svrid/administration/filters", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			const filteredCommands = [];
			for (const command in serverDocument.toObject().config.commands) {
				const commandData = bot.getPublicCommandMetadata(command);
				if (commandData && commandData.defaults.isNSFWFiltered) {
					filteredCommands.push(command);
				}
			}
			res.render("pages/admin-filters.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
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
		});
	});
	io.of("/dashboard/administration/filters").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/administration/filters", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
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
							Object.values(svr.channels).forEach(ch => {
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

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console message of the day
	app.get("/dashboard/:svrid/administration/message-of-the-day", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-message-of-the-day.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					message_of_the_day: serverDocument.config.message_of_the_day,
				},
			});
		});
	});
	io.of("/dashboard/administration/message-of-the-day").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/administration/message-of-the-day", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			const alreadyEnabled = serverDocument.config.message_of_the_day.isEnabled;
			serverDocument.config.message_of_the_day.isEnabled = req.body.isEnabled === "on";
			serverDocument.config.message_of_the_day.message_content = req.body.message_content;
			serverDocument.config.message_of_the_day.channel_id = req.body.channel_id;
			serverDocument.config.message_of_the_day.interval = parseInt(req.body.interval);

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);

			if (!alreadyEnabled && serverDocument.config.message_of_the_day.isEnabled) {
				createMessageOfTheDay(svr.id);
			}
		});
	});

	// Admin console voicetext channels
	app.get("/dashboard/:svrid/administration/voicetext-channels", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-voicetext-channels.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				voiceChannelData: getChannelData(svr, "voice"),
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					voicetext_channels: serverDocument.config.voicetext_channels,
				},
			});
		});
	});
	io.of("/dashboard/administration/voicetext-channels").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/administration/voicetext-channels", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			serverDocument.config.voicetext_channels = [];
			Object.values(svr.channels).forEach(ch => {
				if (ch.type === "voice") {
					if (req.body[`voicetext_channels-${ch.id}`] === "on") {
						serverDocument.config.voicetext_channels.push(ch.id);
					}
				}
			});

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console roles
	app.get("/dashboard/:svrid/administration/roles", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-roles.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
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
					perms: bot.getPublicCommandMetadata("perms").description,
					role: bot.getPublicCommandMetadata("role").description,
					roleinfo: bot.getPublicCommandMetadata("roleinfo").description,
				},
				commandCategories: {
					perms: bot.getPublicCommandMetadata("perms").category,
					role: bot.getPublicCommandMetadata("role").category,
					roleinfo: bot.getPublicCommandMetadata("roleinfo").category,
				},
			});
		});
	});
	io.of("/dashboard/administration/roles").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/administration/roles", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			parseCommandOptions(svr, serverDocument, "roleinfo", req.body);
			parseCommandOptions(svr, serverDocument, "role", req.body);
			serverDocument.config.custom_roles = [];
			Object.values(svr.roles).forEach(role => {
				if (role.name !== "@everyone" && role.name.indexOf("color-") !== 0) {
					if (req.body[`custom_roles-${role.id}`] === "on") {
						serverDocument.config.custom_roles.push(role.id);
					}
				}
			});
			parseCommandOptions(svr, serverDocument, "perms", req.body);

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console logs
	app.get("/dashboard/:svrid/administration/logs", async (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			try {
				let serverLogs = serverDocument.logs.length > 200 ? serverDocument.logs.toObject().slice(serverDocument.logs.length - 200) : serverDocument.logs.toObject();
				serverLogs = serverLogs.filter(serverLog => ((!req.query.q || serverLog.content.toLowerCase().indexOf(req.query.q.toLowerCase()) > -1) && (!req.query.chid || serverLog.channelid === req.query.chid)));
				serverLogs.map(serverLog => {
					const ch = serverLog.channelid ? svr.channels[serverLog.channelid] : null;
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
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					sudo: adminLvl !== 3,
					serverData: {
						name: svr.name,
						id: svr.id,
						icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
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
		});
	});

	// Admin console name display
	app.get("/dashboard/:svrid/other/name-display", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-name-display.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					name_display: serverDocument.config.name_display,
				},
				exampleUsername: consolemember.user.username,
				exampleNickname: consolemember.nickname,
				exampleDiscriminator: consolemember.user.discriminator,
				currentExample: bot.getName(svr, serverDocument, consolemember),
			});
		});
	});
	io.of("/dashboard/administration/name-display").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/other/name-display", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			serverDocument.config.name_display.use_nick = req.body["name_display-use_nick"] === "on";
			serverDocument.config.name_display.show_discriminator = req.body["name_display-show_discriminator"] === "on";

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
		});
	});

	// Admin console ongoing activities
	app.get("/dashboard/:svrid/other/ongoing-activities", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			const ongoingTrivia = [];
			const ongoingPolls = [];
			const ongoingGiveaways = [];
			const ongoingLotteries = [];
			serverDocument.channels.forEach(channelDocument => {
				const ch = svr.channels[channelDocument._id];
				if (ch) {
					if (channelDocument.trivia.isOngoing) {
						ongoingTrivia.push({
							channel: {
								name: ch.name,
								id: ch.id,
							},
							set: channelDocument.trivia.set_id,
							score: channelDocument.trivia.score,
							max_score: channelDocument.trivia.past_questions.length - 1,
							responders: channelDocument.trivia.responders.length,
						});
					}
					if (channelDocument.poll.isOngoing) {
						const creator = svr.members[channelDocument.poll.creator_id] || { user: { username: "invalid-user" } };
						ongoingPolls.push({
							title: channelDocument.poll.title,
							channel: {
								name: ch.name,
								id: ch.id,
							},
							rawCreated: moment(channelDocument.poll.created_timestamp).format(configJS.moment_date_format),
							relativeCreated: moment(channelDocument.poll.created_timestamp).fromNow(),
							creator: creator.user.username,
							options: channelDocument.poll.options.length,
							responses: channelDocument.poll.responses.length,
						});
					}
					if (channelDocument.giveaway.isOngoing) {
						const creator = svr.members[channelDocument.giveaway.creator_id] || { user: "invalid-user" };
						ongoingGiveaways.push({
							title: channelDocument.giveaway.title,
							channel: {
								name: ch.name,
								id: ch.id,
							},
							creator: creator.user.username,
							rawExpiry: moment(channelDocument.giveaway.expiry_timestamp).format(configJS.moment_date_format),
							relativeExpiry: Math.ceil((channelDocument.giveaway.expiry_timestamp - Date.now()) / 3600000),
							participants: channelDocument.giveaway.participant_ids.length,
						});
					}
					if (channelDocument.lottery.isOngoing) {
						const creator = svr.members[channelDocument.lottery.creator_id] || { user: { username: "invalid-user" } };
						ongoingLotteries.push({
							channel: {
								name: ch.name,
								id: ch.id,
							},
							tickets: channelDocument.lottery.participant_ids.length,
							creator: creator.user.username,
						});
					}
				}
			});

			let defaultChannel;

			let generalChannel = Object.values(svr.channels).find(ch => (ch.name === "general" || ch.name === "mainchat") && ch.type === "text");

			if (generalChannel) defaultChannel = generalChannel;
			else defaultChannel = Object.values(svr.channels).filter(c => c.type === "text")
				.sort((a, b) => a.rawPosition - b.rawPosition)
				.first();

			res.render("pages/admin-ongoing-activities.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
					defaultChannel: defaultChannel.name,
				},
				currentPage: `${req.baseUrl}${req.path}`,
				trivia: ongoingTrivia,
				polls: ongoingPolls,
				giveaways: ongoingGiveaways,
				lotteries: ongoingLotteries,
				commandPrefix: bot.getCommandPrefix(svr, serverDocument),
			});
		});
	});
	io.of("/dashboard/administration/ongoing-activities").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/other/ongoing-activities", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if (req.body["end-type"] && req.body["end-id"]) {
				switch (req.body["end-type"]) {
					case "trivia":
						bot.IPC.send("modifyActivity", { action: "end", activity: "trivia", guild: svr.id, channel: req.body["end-id"] });
						break;
					case "poll":
						bot.IPC.send("modifyActivity", { action: "end", activity: "poll", guild: svr.id, channel: req.body["end-id"] })
						break;
					case "giveaway":
						bot.IPC.send("modifyActivity", { action: "end", activity: "giveaway", guild: svr.id, channel: req.body["end-id"] });
						break;
					case "lottery":
						bot.IPC.send("modifyActivity", { action: "end", activity: "lottery", guild: svr.id, channel: req.body["end-id"] });
						break;
				}
				res.sendStatus(200);
			} else {
				res.sendStatus(400);
			}
		});
	});

	// Admin console public data
	app.get("/dashboard/:svrid/other/public-data", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-public-data.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons"),
				},
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					public_data: serverDocument.config.public_data,
					isBanned: configJSON.activityBlocklist.includes(svr.id),
					canUnban: configJSON.maintainers.includes(consolemember.id),
				},
			});
		});
	});
	io.of("/dashboard/other/public-data").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/other/public-data", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			serverDocument.config.public_data.isShown = req.body.isShown === "on";
			let createInvite = false;
			if (!serverDocument.config.public_data.server_listing.isEnabled && req.body["server_listing-isEnabled"] === "on") {
				createInvite = true;
			}
			serverDocument.config.public_data.server_listing.isEnabled = req.body["server_listing-isEnabled"] === "on";
			serverDocument.config.public_data.server_listing.category = req.body["server_listing-category"];
			serverDocument.config.public_data.server_listing.description = req.body["server_listing-description"];
			if (createInvite) {
				saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
				bot.IPC.send("createPublicInviteLink", { guild: svr.id });
			} else if (!req.body["server_listing-isEnabled"] && serverDocument.config.public_data.server_listing.invite_link) {
				serverDocument.config.public_data.server_listing.invite_link = null;
				saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
				bot.IPC.send("deletePublicInviteLink", { guild: svr.id });
			} else {
				saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
			}
		});
	});

	// Admin console extensions
	app.get("/dashboard/:svrid/other/extensions", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			const extensionData = serverDocument.toObject().extensions;
			extensionData.forEach(extensionDocument => {
				extensionDocument.store = sizeof(extensionDocument.store);
			});
			res.render("pages/admin-extensions.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png",
				},
				currentPage: `${req.baseUrl}${req.path}`,
				configData: {
					extensions: extensionData,
				},
			});
		});
	});
	io.of("/dashboard/other/extensions").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/other/extensions", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (Object.keys(req.body).length === 1 && Object.keys(req.body)[0].indexOf("new-") === 0) {
				const state = Object.keys(req.body)[0].split("-")[1];
				db.gallery.findOne({
					_id: req.body[Object.keys(req.body)[0]],
					state,
				}, (err, galleryDocument) => {
					if (!err && galleryDocument) {
						let extensionDocument = serverDocument.extensions.id(galleryDocument._id);
						let isUpdate = true;
						if (!extensionDocument) {
							extensionDocument = {};
							isUpdate = false;
						}

						extensionDocument.name = galleryDocument.name;
						extensionDocument.level = "third";
						extensionDocument.type = galleryDocument.type;
						extensionDocument.key = galleryDocument.key;
						extensionDocument.keywords = galleryDocument.keywords;
						extensionDocument.case_sensitive = galleryDocument.case_sensitive;
						extensionDocument.interval = galleryDocument.interval;
						extensionDocument.usage_help = galleryDocument.usage_help;
						extensionDocument.extended_help = galleryDocument.extended_help;
						extensionDocument.updates_available = 0;
						extensionDocument.last_updated = galleryDocument.last_updated;

						if (isUpdate) {
							dashboardUpdate("/dashboard/other/extension-builder", svr.id);
						} else {
							extensionDocument.admin_level = ["command", "keyword"].indexOf(galleryDocument.type) > -1 ? 0 : null;
							extensionDocument.enabled_channel_ids = [svr.defaultChannel.id];
							extensionDocument.store = {};
							serverDocument.extensions.push(extensionDocument);
						}

						try {
							writeFile(`${__dirname}/../Extensions/${svr.id}-${extensionDocument._id}.abext`, fs.readFileSync(`${__dirname}/../Extensions/gallery-${req.body[Object.keys(req.body)[0]]}.abext`), () => {
								saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
							});
						} catch (err) {
							saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
						}
					} else {
						res.sendStatus(500);
					}
				});
			} else {
				for (let i = 0; i < serverDocument.extensions.length; i++) {
					if (req.body[`extension-${i}-removed`] !== null) {
						try {
							fs.unlinkSync(`${__dirname}/../Extensions/${svr.id}-${serverDocument.extensions[i]._id}.abext`);
						} catch (err) {
							winston.error(`Failed to delete extension ${svr.id}-${serverDocument.extensions[i]._id}.abext`, err);
						}
						serverDocument.extensions[i] = null;
						break;
					}
				}
				serverDocument.extensions.spliceNullElements();

				saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
			}
		});
	});

	// Admin console extension builder
	app.get("/dashboard/:svrid/other/extension-builder", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			let extensionData = {};
			if (req.query.extid) {
				extensionData = serverDocument.extensions.id(req.query.extid);
				if (!extensionData) {
					renderError(res, "Failed to fetch extension data.");
					return;
				} else {
					try {
						extensionData.code = fs.readFileSync(`${__dirname}/../Extensions/${svr.id}-${extensionData._id}.abext`);
					} catch (err) {
						extensionData.code = "";
					}
				}
			}
			res.render("pages/admin-extension-builder.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudo: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: `${req.baseUrl}${req.path}`,
				extensionData,
			});
		});
	});
	io.of("/dashboard/other/extension-builder").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/other/extension-builder", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (validateExtensionData(req.body)) {
				let extensionDocument = serverDocument.extensions.id(req.query.extid);
				let isUpdate = true;
				if (!extensionDocument) {
					extensionDocument = {};
					isUpdate = false;
				}
				const enabled_channel_ids = [];
				svr.channels.forEach(ch => {
					if (ch.type === 0) {
						if (req.body[`enabled_channel_ids-${ch.id}`] === "on") {
							enabled_channel_ids.push(ch.id);
						}
					}
				});
				extensionDocument.level = "third";
				extensionDocument.enabled_channel_ids = enabled_channel_ids;
				extensionDocument.admin_level = req.body[`${req.body.type}-admin_level`];
				extensionDocument = writeExtensionData(extensionDocument, req.body);

				if (!isUpdate) {
					serverDocument.extensions.push(extensionDocument);
					extensionDocument._id = serverDocument.extensions[serverDocument.extensions.length - 1]._id;
					if (!req.query.extid) {
						req.originalUrl += `&extid=${extensionDocument._id}`;
					}
					dashboardUpdate("/dashboard/other/extensions", svr.id);
				}

				writeFile(`${__dirname}/../Extensions/${svr.id}-${extensionDocument._id}.abext`, req.body.code, () => {
					saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
				});
			} else {
				renderError(res, "Failed to verify extension data!");
			}
		});
	});

	// Admin console export configs
	app.get("/dashboard/:svrid/other/export", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.json(serverDocument.toObject().config);
		});
	});

	// Admin console message history
	app.get("/dashboard/:svrid/messages", (req, res) => {
		checkAuth(req, res, () => {
			res.render("pages/admin-messages.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null
			});
		});
	});

	// Maintainer console overview
	app.get("/dashboard/maintainer/maintainer", (req, res) => {
		checkAuth(req, res, () => {
			db.servers.aggregate([{
				$group: {
					_id: null,
					total: {
						$sum: {
							$add: ["$messages_today"],
						},
					},
				},
			}], async (err, result) => {
				let messageCount = 0;
				if (!err && result) {
					messageCount = result[0].total;
				}
				const trafficData = bot.traffic.data();
				const version = await Updater.check();
				res.render("pages/maintainer.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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
					serverCount: await bot.guilds.totalCount,
					userCount: await bot.users.totalCount,
					totalMessageCount: messageCount,
					roundedUptime: getRoundedUptime(process.uptime()),
					shardCount: configJS.shardTotal,
					version: configJSON.version,
					utd: version["up-to-date"],
					latestVersion: version.latest ? version.latest.version : null,
					disabled: version === 404,
					trafficData: await trafficData,
					currentShard: bot.shardID,
				});
			});
		});
	});

	// Maintainer console server list
	app.get("/dashboard/maintainer/servers/server-list", (req, res) => {
		checkAuth(req, res, async consolemember => {
			const renderPage = data => {
				res.render("pages/maintainer-server-list.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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
					activeSearchQuery: req.query.q,
					selectedServer: req.query.i || "0",
					data,
				});
			};

			if (req.query.q) {
				const query = req.query.q.toLowerCase();
				const data = Object.values(await getGuild.get(bot, "*", {
					resolve: ["id", "ownerID", "name", "icon"],
					channels: ["id", "type", "name", "position"],
					findFilter: query,
				})).map(svr => ({
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons"),
					channelData: getChannelData(svr),
				}));
				if (data.length < parseInt(req.query.i) + 1) req.query.i = 0;

				if (req.query.leave !== undefined) {
					bot.IPC.send("leaveGuild", data[parseInt(req.query.i)].id);
					renderPage();
				} else if (req.query.block !== undefined) {
					bot.IPC.send("leaveGuild", data[parseInt(req.query.i)].id);
					configJSON.guildBlocklist.push(data[parseInt(req.query.i)].id);
					saveMaintainerConsoleOptions(consolemember, req, res, true, true);
					renderPage();
				} else if (req.query.message) {
					bot.IPC.send("sendMessage", { guild: data[parseInt(req.query.i)].id, channel: req.query.chid, message: req.query.message });
					res.sendStatus(200);

				} else {
					renderPage(data);
				}
			} else {
				renderPage();
			}
		});
	});
	app.post("/dashboard/maintainer/servers/server-list", (req, res) => {
		checkAuth(req, res, async consolemember => {
			if (req.body.removeFromActivity) {
				configJSON.activityBlocklist.push(req.body.removeFromActivity);
			}
			if (req.body.unbanFromActivity) {
				const index = configJSON.activityBlocklist.indexOf(req.body.unbanFromActivity);
				if (index > -1) configJSON.activityBlocklist.splice(index, 1);
			}
			saveMaintainerConsoleOptions(consolemember, req, res, true);
		});
	});

	// Maintainer console big message
	app.get("/dashboard/maintainer/servers/big-message", (req, res) => {
		checkAuth(req, res, async () => {
			res.render("pages/maintainer-big-message.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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
				serverCount: await bot.guilds.totalCount,
			});
		});
	});
	app.post("/dashboard/maintainer/servers/big-message", (req, res) => {
		checkAuth(req, res, () => {
			if (req.body.message) {
				bot.IPC.send("sendMessage", { guild: "*", message: req.body.message });
				res.sendStatus(200);
			} else {
				res.sendStatus(400);
			}
		});
	});

	// Maintainer console blocklist
	app.get("/dashboard/maintainer/global-options/blocklist", (req, res) => {
		checkAuth(req, res, async () => {
			res.render("pages/maintainer-blocklist.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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
				config: {
					global_blocklist: await Promise.all(configJSON.userBlocklist.map(async a => {
						const usr = await bot.users.fetch(a, true) || {};
						return {
							name: usr.username,
							id: usr.id,
							avatar: bot.getAvatarURL(usr.id, usr.avatar) || "/static/img/discord-icon.png",
						};
					})),
				},
			});
		});
	});
	io.of("/dashboard/global-options/blocklist").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/maintainer/global-options/blocklist", (req, res) => {
		checkAuth(req, res, async consolemember => {
			if (req.body["new-user"]) {
				let usr = await db.users.findOne({ username: req.body["new-user"]}).exec();
				if (!usr) usr = await bot.users.fetch(req.body["new-user"], true);
				if (usr && configJSON.userBlocklist.indexOf(usr.id ? usr.id : usr._id) === -1 && configJSON.maintainers.indexOf(usr.id ? usr.id : usr._id) === -1) {
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

			saveMaintainerConsoleOptions(consolemember, req, res);
		});
	});

	// Maintainer console bot user options
	app.get("/dashboard/maintainer/global-options/bot-user", (req, res) => {
		checkAuth(req, res, async () => {
			res.render("pages/maintainer-bot-user.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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
				bot_user: {
					status: configJSON.status,
					game: configJSON.activity.name,
					game_default: configJSON.activity.name === "default",
					avatar: bot.user.avatarURL(),
				},
			});
		});
	});
	io.of("/dashboard/global-options/bot-user").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/maintainer/global-options/bot-user", (req, res) => {
		checkAuth(req, res, consolemember => {
			bot.IPC.send("updateBotUser", { avatar: req.body.avatar, username: req.body.username, game: req.body.game, status: req.body.status });
			configJSON.activity.name = req.body.game;
			if (req.body.game === "gawesomebot.com") {
					configJSON.activity.name = "default";
			}
			if (req.body.status) configJSON.status = req.body.status;
			saveMaintainerConsoleOptions(consolemember, req, res, true);
		});
	});

	// Maintainer console homepage options
	app.get("/dashboard/maintainer/global-options/homepage", (req, res) => {
		checkAuth(req, res, () => {
			res.render("pages/maintainer-homepage.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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
				config: {
					header_image: configJSON.headerImage,
					homepageMessageHTML: configJSON.homepageMessageHTML,
				},
				dirname: __dirname,
			});
		});
	});
	io.of("/dashboard/global-options/homepage").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/maintainer/global-options/homepage", (req, res) => {
		checkAuth(req, res, consolemember => {
			configJSON.homepageMessageHTML = req.body.homepageMessageHTML;
			configJSON.headerImage = req.body.header_image;

			saveMaintainerConsoleOptions(consolemember, req, res, true);
		});
	});

	// Maintainer console wiki contributors
	app.get("/dashboard/maintainer/global-options/wiki-contributors", (req, res) => {
		checkAuth(req, res, async consolemember => {
			res.render("pages/maintainer-wiki-contributors.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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
				config: {
					wiki_contributors: await Promise.all(configJSON.maintainers.map(async a => {
						const usr = await bot.users.fetch(a, true) || {
							id: "invalid-user",
							username: "invalid-user",
						};
						return {
							name: usr.username,
							id: usr.id,
							avatar: usr.avatarURL() || "/static/img/discord-icon.png",
							isMaintainer: true,
							isSudoMaintainer: configJSON.sudoMaintainers.includes(usr.id),
						};
					}).concat(configJSON.wikiContributors.map(async a => {
						const usr = await bot.users.fetch(a, true) || {
							id: "invalid-user",
							username: "invalid-user",
						};
						return {
							name: usr.username,
							id: usr.id,
							avatar: usr.avatarURL() || "/static/img/discord-icon.png",
						};
					}))),
				},
				showRemove: configJSON.maintainers.includes(consolemember.id),
			});
		});
	});
	io.of("/dashboard/global-options/wiki-contributors").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/maintainer/global-options/wiki-contributors", (req, res) => {
		checkAuth(req, res, async consolemember => {
			if (req.body["new-user"]) {
				let usr = await db.users.findOne({ username: req.body["new-user"]}).exec();
				if (!usr) usr = await bot.users.fetch(req.body["new-user"], true);
				if (!usr.id) usr.id = usr._id;
				if (usr && configJSON.wikiContributors.indexOf(usr.id) === -1) {
					configJSON.wikiContributors.push(usr.id);
				}
			} else if (configJSON.maintainers.includes(consolemember.id)) {
				let i = configJSON.wikiContributors.indexOf(req.body["contributor-removed"]);
				configJSON.wikiContributors[i] = null;
				configJSON.wikiContributors.spliceNullElements();
			}

			saveMaintainerConsoleOptions(consolemember, req, res);
		});
	});

	// Maintainer console maintainers
	app.get("/dashboard/maintainer/management/maintainers", (req, res) => {
		checkAuth(req, res, async consolemember => {
			res.render("pages/maintainer-maintainers.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
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

module.exports.close = (servers) => {
	if (!servers.forEach) servers = Object.values(servers);
	winston.info("Closing Web Interface...");
	servers.forEach(server => server.close());
	winston.warn("This shard is no longer hosting a Web Interface.");
};
