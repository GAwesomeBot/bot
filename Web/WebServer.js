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
	// Admin console name display
	app.get("/dashboard/:svrid/other/name-display", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {

		});
	});
	io.of("/dashboard/administration/name-display").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/other/name-display", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {

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
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
        sudo: req.isSudo,
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
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
        sudo: req.isSudo,
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
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
        sudo: req.isSudo,
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
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
        sudo: req.isSudo,
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
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null
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
