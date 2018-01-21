const express = require("express");
const http = require("http");
const https = require("https");
const compression = require("compression");
const sio = require("socket.io");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const RateLimit = require("express-rate-limit");
const ejs = require("ejs");
const session = require("express-session");
const mongooseSessionStore = require("connect-mongo")(session);
const passport = require("passport");
const passportSocketIo = require("passport.socketio");
const discordStrategy = require("passport-discord").Strategy;
const discordOAuthScopes = ["identify", "guilds", "email"];
const path = require("path");
const fs = require("fs");
const fsn = require("fs-nextra");
const writeFile = require("write-file-atomic");
const sizeof = require("object-sizeof");
const moment = require("moment");
const textDiff = require("text-diff");
const diff = new textDiff();

const reload = require("require-reload")(require);

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
const xssFilters = require("xss-filters");
const removeMd = require("remove-markdown");

const database = require("./../Database/Driver.js");

const Giveaways = require("./../Modules/Giveaways.js");
// const Lotteries = require("./../Modules/Lotteries.js");
// const Polls = require("./../Modules/Polls.js");
const Trivia = require("./../Modules/Trivia.js");
const Updater = require("./../Modules/Updater.js");

const Utils = require("./../Modules/Utils");
const getGuild = require("./../Modules").GetGuild;

const { LoggingLevels, AllowedEvents, Colors } = require("../Internals/Constants");

const app = express();
app.use(compression());
if (process.argv.includes("-p") || process.argv.includes("--proxy")) app.enable("trust proxy");
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

const findQueryUser = (query, list) => {
	let usr = list[query];
	if(!usr) {
		const usernameQuery = query.substring(0, query.lastIndexOf("#")>-1 ? query.lastIndexOf("#") : query.length);
		const discriminatorQuery = query.indexOf("#")>-1 ? query.substring(query.lastIndexOf("#")+1) : "";
		const usrs = Object.values(list).filter(a => {
			return (a.user || a).username === usernameQuery;
		});
		if(discriminatorQuery) {
			usr = usrs.find(a => {
				return (a.user || a).discriminator === discriminatorQuery;
			});
		} else if(usrs.length>0) {
			usr = usrs[0];
		}
	}
	return usr;
};

const getUserList = list => list.filter(usr => usr.bot !== true).map(usr => `${usr.username}#${usr.discriminator}`).sort();

const getChannelData = (svr, type) => Object.values(svr.channels).filter(ch => ch.type === (type || "text")).map(ch => ({
	name: ch.name,
	id: ch.id,
	position: ch.position,
	rawPosition: ch.rawPosition,
})).sort((a, b) => a.rawPosition - b.rawPosition);

const getRoleData = svr => Object.values(svr.roles).filter(role => role.name !== "@everyone" && role.name.indexOf("color-") !== 0).map(role => ({
	name: role.name,
	id: role.id,
	color: role.hexColor.substring(1),
	position: role.position,
})).sort((a, b) => b.position - a.position);

const getAuthUser = user => ({
	username: user.username,
	id: user.id,
	avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : "/static/img/discord-icon.png",
});

const getRoundedUptime = uptime => uptime > 86400 ? `${Math.floor(uptime / 86400)}d` : `${Math.floor(uptime / 3600)}h`;

/* eslint-disable max-len, no-shadow, callback-return, max-nested-callbacks, no-empty-function, handle-callback-err, newline-per-chained-call, no-useless-concat, no-fallthrough, no-mixed-operators, no-unused-vars */
// Setup the web server
module.exports = (bot, auth, configJS, winston, db = global.Database) => {
	const renderError = (res, text, line, code = 500) => res.status(code).render("pages/error.ejs", { error_text: text, error_line: line || configJS.errorLines[Math.floor(Math.random() * configJS.errorLines.length)] });

	const dashboardUpdate = (namespace, location) => bot.IPC.send("dashboardUpdate", { namespace: namespace, location: location });

	const createMessageOfTheDay = (id) => bot.IPC.send("createMOTD", { guild: id });

	// Set the clientID and clientSecret from argv if needed
	if (process.argv.includes("--CID")) {
		auth.discord.clientID = process.argv[process.argv.indexOf("--CID") + 1]
		auth.discord.clientSecret = process.argv[process.argv.indexOf("--CID") + 2]
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

	app.use((req, res, next) => {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Credentials", true);
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		next();
	});

	app.use("/", (req, res, next) => {
		winston.verbose(`Incoming ${req.protocol} ${req.method} on ${req.path}.`, { params: req.params, query: req.query, protocol: req.protocol, method: req.method, path: req.path });
		if (global.isUnavailable) {
			res.status(503).render("pages/503.ejs", {});
		}	else {
			if (!req.cookies.trafficID || req.cookies.trafficID !== bot.traffic.TID) {
				let TID = bot.traffic.TID;
				res.cookie("trafficID", TID, { httpOnly: true });
			}
			if (req.method === "GET" && !req.path.startsWith("/static") && !req.path.startsWith("/api") && !["/header-image", "/userlist", "/serverlist"].includes(req.path)) bot.traffic.count(req.cookies["trafficID"], req.isAuthenticated());
			next();
		}
	});

	// Serve public dir
	app.use("/static/:type", (req, res, next) => {
		if (req.get("Accept") && req.get("Accept").indexOf("image/webp") > -1 && req.params.type === "img" && ![".gif", "webp"].includes(req.path.substr(req.path.length - 4))) {
			res.redirect("/static/img" + req.path.substring(0, req.path.lastIndexOf(".")) + ".webp");
		} else return express.static(`${__dirname}/public/${req.params.type}`, { maxAge: 86400000 })(req, res, next);
	});

	// Open web interface
	function requireHTTPS(req, res, next) {
		if (!req.secure) {
			return res.redirect(`https://${req.hostname}:${configJS.httpsPort}${req.url}`);
		}
		next();
	}
	if (configJS.cert && configJS.privKey && configJS.httpsPort) {
		if (configJS.httpsRedirect) {
			app.use(requireHTTPS);
		}
		const privKey = fs.readFileSync(configJS.privKey, "utf8", err => { if (err) winston.error(err); });
		const cert = fs.readFileSync(configJS.cert, "utf8", err => { if (err) winston.error(err); });
		const credentials = {
			key: privKey,
			cert: cert,
		};
		const httpsServer = https.createServer(credentials, app);
		httpsServer.on("error", (err) => {
			winston.error("We failed to listen to incoming web requests on the secure WebServer x/\n", { "err": err })
		})
		httpsServer.listen(configJS.httpsPort, configJS.serverIP, () => {
			winston.info(`Opened https web interface on ${configJS.serverIP}:${configJS.httpsPort}`);
		});
	}
	const server = http.createServer(app);
	server.on("error", (err) => {
		winston.error("We failed to listen to incoming web requests on the WebServer x/\n", { "err": err });
	})
	server.listen(configJS.httpPort, configJS.serverIP, () => {
		winston.info(`Opened http web interface on ${configJS.serverIP}:${configJS.httpPort}`);
		process.setMaxListeners(0);
	});

	// Setup socket.io for dashboard
	const io = sio(typeof httpsServer !== "undefined" ? httpsServer : server);
	io.use(passportSocketIo.authorize({
		key: "connect.sid",
		secret: configJS.secret,
		store: sessionStore,
		passport,
	}));

	bot.IPC.on("dashboardUpdate", msg => {
		const path = msg.namespace;
		const param = msg.location;
		try {
			io.of(path).emit("update", param);
			if (param === "maintainer") global.configJSON = reload("../Configurations/config.json");
		} catch (err) {
			winston.warn("An error occurred while handling a dashboard WebSocket!", err);
		}
	});

	// Landing page
	app.get("/", async (req, res) => {
		const uptime = process.uptime();
		const guildSize = bot.guilds.totalCount;
		const userSize = bot.users.totalCount;
		res.render("pages/landing.ejs", {
			authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
			bannerMessage: configJSON.homepageMessageHTML,
			rawServerCount: await guildSize,
			roundedServerCount: Math.floor(await guildSize / 100) * 100,
			rawUserCount: `${Math.floor(await userSize / 1000)}K`,
			rawUptime: moment.duration(uptime, "seconds").humanize(),
			roundedUptime: getRoundedUptime(uptime),
		});
	});

	// Add to server link
	app.get("/add", (req, res) => {
		res.redirect(configJS.oauthLink.format({ id: bot.user.id }));
	});

	// GAwesomeBot data API
	app.use("/api/", new RateLimit({
		windowMs: 3600000,
		max: 150,
		delayMs: 0,
	}));
	app.get("/api", async (req, res) => {
		res.json({
			server_count: await bot.guilds.totalCount,
			user_count: await bot.users.totalCount,
		});
	});
	const getServerData = async (serverDocument, webp = false) => {
		let data;
		let svr = await getGuild.get(bot, serverDocument._id, { resolve: ["icon", "createdAt", "ownerID", "id", "name"], members: ["nickname", "user"] });
		if (svr) {
			const owner = bot.users.get(svr.ownerID) || svr.members[svr.ownerID].user;
			data = {
				name: svr.name,
				id: svr.id,
				icon: bot.getAvatarURL(svr.id, svr.icon, "icons", webp),
				owner: {
					username: owner.username,
					id: owner.id,
					avatar: bot.getAvatarURL(owner.id, owner.avatar, "avatars", webp),
					name: owner.username,
				},
				members: Object.keys(svr.members).length,
				messages: serverDocument.messages_today,
				rawCreated: moment(svr.createdAt).format(configJS.moment_date_format),
				relativeCreated: Math.ceil((Date.now() - new Date(svr.createdAt)) / 86400000),
				command_prefix: bot.getCommandPrefix(svr, serverDocument),
				category: serverDocument.config.public_data.server_listing.category,
				description: serverDocument.config.public_data.server_listing.isEnabled ? md.makeHtml(xssFilters.inHTMLData(serverDocument.config.public_data.server_listing.description || "No description provided.")) : null,
				invite_link: serverDocument.config.public_data.server_listing.isEnabled ? serverDocument.config.public_data.server_listing.invite_link || "javascript:alert('Invite link not available');" : null,
			};
		}
		return data;
	};
	app.get("/api/servers", async (req, res) => {
		const params = {
			"config.public_data.isShown": true,
		};
		if (req.query.id) {
			params._id = req.query.id;
		}
		let webp = req.accepts("image/webp") !== false;
		db.servers.find(params).skip(req.query.start ? parseInt(req.query.start) : 0).limit(req.query.count ? parseInt(req.query.count) : 0)
			.exec(async (err, serverDocuments) => {
				if (!err && serverDocuments) {
					const data = await Promise.all(serverDocuments.map(serverDocument => getServerData(serverDocument, webp) || serverDocument._id));
					res.json(data);
				} else {
					res.sendStatus(400);
				}
			});
	});
	const getUserData = async (usr, userDocument) => {
		const botServers = Object.values(await getGuild.get(bot, "*", { resolve: ["name", "id", "icon", "ownerID"], mutual: usr.id }));
		const mutualServers = botServers.sort((a, b) => a.name.localeCompare(b.name));
		const userProfile = {
			username: usr.username,
			discriminator: usr.discriminator,
			avatar: usr.avatarURL() || "/static/img/discord-icon.png",
			id: usr.id,
			status: usr.presence.status,
			game: await bot.getGame(usr),
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
				const owner = await bot.users.fetch(svr.ownerID, true);
				userProfile.mutualServers.push({
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons"),
					owner: owner.username,
				});
			}
		}
		return userProfile;
	};
	app.get("/api/users", async (req, res) => {
		if (!req.query.id) {
			res.status(400).json({ message: `Query param "id" is missing` });
			return;
		}
		try {
			let user = bot.users.get(req.query.id);
			if (!user) user = await bot.users.fetch(req.query.id, true);

			if (user) {
				let userDocument = await db.users.findOne({ _id: user.id });
				if (!userDocument) userDocument = await db.users.create(new Users({ _id: user.id }));
				res.json(await getUserData(user, userDocument));
			} else {
				res.status(400).json({ message: `Invalid user ID provided` });
			}
		} catch (_) {
			res.status(400).json({ message: `Invalid user ID provided` });
		}
	});
	const getExtensionData = async galleryDocument => {
		const owner = await bot.users.fetch(galleryDocument.owner_id, true) || {};
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
	app.get("/api/extensions", async (req, res) => {
		const params = {};
		if (req.query.id) {
			params._id = req.query.id;
		}
		if (req.query.name) {
			params.name = req.query.name;
		}
		if (req.query.type) {
			params.type = req.query.type;
		}
		if (req.query.status) {
			params.state = req.query.status;
		}
		if (req.query.owner) {
			params.owner_id = req.query.owner;
		}
		db.gallery.count(params, (err, rawCount) => {
			if (!err || rawCount === null) {
				rawCount = 0;
			}
			db.gallery.find(params).skip(req.query.start ? parseInt(req.query.start) : 0).limit(req.query.count ? parseInt(req.query.count) : rawCount)
				.exec((erro, galleryDocuments) => {
					if (!erro && galleryDocuments) {
						const data = galleryDocuments.map(galleryDocument => getExtensionData(galleryDocument));
						res.json(data);
					} else {
						res.sendStatus(400);
					}
				});
		});
	});

	// Activity page (servers, profiles, etc.)
	app.get("/activity", (req, res) => {
		res.redirect("/activity/servers");
	});
	app.get("/activity/(|servers|users)", (req, res) => {
		db.servers.aggregate([{
			$group: {
				_id: null,
				total: {
					$sum: {
						$add: ["$messages_today"],
					},
				},
				active: {
					$sum: {
						$cond: [
							{ $gt: ["$messages_today", 0] },
							1,
							0,
						],
					},
				},
			},
		}], async (err, result) => {
			const guildAmount = await bot.guilds.totalCount;
			const userAmount = await bot.users.totalCount;
			let messageCount = 0;
			let activeServers = guildAmount;
			if (!err && result) {
				messageCount = result[0].total;
				activeServers = result[0].active;
			}

			const renderPage = data => {
				res.render("pages/activity.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					isMaintainer: req.isAuthenticated() ? configJSON.maintainers.includes(getAuthUser(req.user).id) : false,
					rawServerCount: guildAmount,
					rawUserCount: userAmount,
					totalMessageCount: messageCount,
					numActiveServers: activeServers,
					activeSearchQuery: req.query.q,
					mode: req.path.substring(req.path.lastIndexOf("/") + 1),
					data,
				});
			};

			if (req.path === "/activity/servers") {
				if (!req.query.q) {
					req.query.q = "";
				}
				let count;
				if (!req.query.count || isNaN(req.query.count) || req.query.count > 64) {
					count = 16;
				} else {
					count = parseInt(req.query.count) || guildAmount;
				}
				let page;
				if (!req.query.page || isNaN(req.query.page)) {
					page = 1;
				} else {
					page = parseInt(req.query.page);
				}
				if (!req.query.sort) {
					req.query.sort = "messages-des";
				}
				if (!req.query.category) {
					req.query.category = "All";
				}
				if (!req.query.publiconly) {
					req.query.publiconly = false;
				}

				const matchCriteria = {
					"config.public_data.isShown": true,
				};
				if (req.query.q) {
					const query = req.query.q.toLowerCase();
					const servers = await getGuild.get(bot, "*", { only: true, resolve: ["id", "name"] });
					matchCriteria._id = {
						$in: Object.keys(servers).map(k => servers[k]).filter(svr => {
							return svr.name.toLowerCase().indexOf(query)>-1 || svr.id === query;
						}).map(svr => {
							return svr.id;
						}),
					};
				} else {
					matchCriteria._id = {
						$in: (await Utils.GetValue(bot, "guilds.keys()", "arr", "Array.from")).filter(svrid => !configJSON.activityBlocklist.includes(svrid)),
					};
				}
				if (req.query.category !== "All") {
					matchCriteria["config.public_data.server_listing.category"] = req.query.category;
				}
				if (req.query.publiconly === "true") {
					matchCriteria["config.public_data.server_listing.isEnabled"] = true;
				}

				let sortParams;
				switch (req.query.sort) {
					case "members-asc":
						sortParams = {
							member_count: 1,
							added_timestamp: 1,
						};
						break;
					case "members-des":
						sortParams = {
							member_count: -1,
							added_timestamp: -1,
						};
						break;
					case "messages-asc":
						sortParams = {
							messages_today: 1,
							added_timestamp: 1,
						};
						break;
					case "messages-des":
					default:
						sortParams = {
							messages_today: -1,
							added_timestamp: -1,
						};
						break;
				}
				db.servers.count(matchCriteria, (err, rawCount) => {
					if (err || rawCount === null) {
						rawCount = guildAmount;
					}
					db.servers.aggregate([
						{
							$match: matchCriteria,
						},
						{
							$project: {
								messages_today: 1,
								"config.public_data": 1,
								"config.command_prefix": 1,
								member_count: {
									$size: "$members",
								},
								added_timestamp: 1,
							},
						},
						{
							$sort: sortParams,
						},
						{
							$skip: count * (page - 1),
						},
						{
							$limit: count,
						},
					], async (err, serverDocuments) => {
						let serverData = [];
						if (!err && serverDocuments) {
							let webp = req.accepts("image/webp") === "image/webp";
							serverData = serverDocuments.map(serverDocument => getServerData(serverDocument, webp));
						}
						serverData = await Promise.all(serverData);
						let pageTitle = "Servers";
						if (req.query.q) {
							pageTitle = `Search for server "${req.query.q}"`;
						}
						renderPage({
							pageTitle,
							itemsPerPage: req.query.count === 0 ? "0" : count.toString(),
							currentPage: page,
							numPages: Math.ceil(rawCount / (count === 0 ? rawCount : count)),
							serverData,
							selectedCategory: req.query.category,
							isPublicOnly: req.query.publiconly,
							sortOrder: req.query.sort,
						});
					});
				});
			} else if (req.path === "/activity/users") {
				if (!req.query.q) {
					req.query.q = "";
				}
				if (req.query.q) {
					db.users.findOne({ $or: [{ _id: req.query.q }, { username: req.query.q }] }, async (err, userDocument) => {
						if (!err && userDocument) {
							const usr = await bot.users.fetch(userDocument._id, true);
							const userProfile = await getUserData(usr, userDocument);
							renderPage({
								pageTitle: `${userProfile.username}'s Profile`,
								userProfile,
							});
						} else {
							renderPage({ pageTitle: `Lookup for user "${req.query.q}"` });
						}
					});
				} else {
					db.users.aggregate([{
						$group: {
							_id: null,
							totalPoints: {
								$sum: {
									$add: "$points",
								},
							},
							publicProfilesCount: {
								$sum: {
									$cond: [
										{ $ne: ["$isProfilePublic", false] },
										1,
										0,
									],
								},
							},
							reminderCount: {
								$sum: {
									$size: "$reminders",
								},
							},
						},
					}], (err, result) => {
						let totalPoints = 0;
						let publicProfilesCount = 0;
						let reminderCount = 0;
						if (!err && result) {
							totalPoints = result[0].totalPoints;
							publicProfilesCount = result[0].publicProfilesCount;
							reminderCount = result[0].reminderCount;
						}

						renderPage({
							pageTitle: "Users",
							totalPoints,
							publicProfilesCount,
							reminderCount,
						});
					});
				}
			}
		});
	});

	// Header image provider
	app.get("/header-image", (req, res) => {
		let headerImage = configJSON.headerImage;
		if (req.get("Accept") && req.get("Accept").indexOf("image/webp") > -1) headerImage = headerImage.substring(0, headerImage.lastIndexOf(".")) + ".webp"
		res.sendFile(`${__dirname}/public/img/${headerImage}`, err => {
			if (err) winston.warn("It seems your headerImage value is invalid!", err)
		});
	});

	// Server list provider for typeahead
	app.get("/serverlist", async (req, res) => {
		const servers = Object.values(await getGuild.get(bot, "*", { only: true, resolve: ["name"] })).map(val => val.name);
		servers.sort();
		res.json(servers);
	});

	// Deny authentication for console
	const deny = (res, isAPI) => isAPI ? res.sendStatus(403) : res.status(403).redirect("/dashboard");
	// Check authentication for console
	const checkPerms = (path, id, svrid) => {
		path = path.replace(`/${svrid}`, "");
		let section = path;
		if (path === `/dashboard/management/eval`) section = "eval";
		else if (path.startsWith(`/dashboard/maintainer`)) return configJSON.maintainers.includes(id);
		else if (path.startsWith(`/dashboard/servers`)) return configJSON.maintainers.includes(id);
		else if (path.startsWith(`/dashboard/global-options`)) section = "administration";
		else if (path.startsWith(`/dashboard/management`)) section = "management";
		else if (path.startsWith(`/dashboard`) && svrid !== "maintainer") section = "sudoMode";
		switch (configJSON.perms[section]) {
			case 0:
				return process.env.GAB_HOST === id;
				break;
			case 1:
				return configJSON.maintainers.includes(id);
				break;
			case 2:
				return configJSON.sudoMaintainers.includes(id);
				break;
			default:
				return true;
		}
	};
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

	app.get("/api/servers/:svrid/:value", (req, res) => {
		checkAuth(req, res, (usr, svr) => {
			switch (req.params.value) {
				case "channels":
					res.json(svr.channels);
					break;
				default:
					res.sendStatus(400);
					break;
			}
		}, true);
	});

	// User list provider for typeahead
	app.get("/userlist", (req, res) => {
		if (req.query.svrid) {
			checkAuth(req, res, (usr, svr) => {
				res.json(getUserList(Object.keys(svr.members).map(member => svr.members[member].user)));
			});
		} else {
			db.users.aggregate([{
				$project: {
					username: 1
				}
			}], (err, users) => {
				if (!err && users) {
					let response = users.map(usr => usr.username || null).filter(u => u !== null && u.split("#")[1] !== "0000").sort();
					response.spliceNullElements();
					res.json(response);
				} else {
					next(err);
				}
			});
		}
	});

	// Extension gallery
	app.get("/extensions", (req, res) => {
		res.redirect("/extensions/gallery");
	});
	app.get("/extensions/(|gallery|queue)", async (req, res) => {
		let count;
		if (!req.query.count) {
			count = 18;
		} else {
			count = parseInt(req.query.count);
		}
		let page;
		if (!req.query.page) {
			page = 1;
		} else {
			page = parseInt(req.query.page);
		}

		const renderPage = (upvoted_gallery_extensions, serverData) => {
			const extensionState = req.path.substring(req.path.lastIndexOf("/") + 1);
			db.gallery.count({
				state: extensionState,
			}, (err, rawCount) => {
				if (err || rawCount === null) {
					rawCount = 0;
				}

				const matchCriteria = {
					state: extensionState,
				};
				if (req.query.id) {
					matchCriteria._id = req.query.id;
				} else if (req.query.q) {
					matchCriteria.$text = {
						$search: req.query.q,
					};
				}

				db.gallery.find(matchCriteria).sort("-featured -points -last_updated").skip(count * (page - 1)).limit(count).exec(async (err, galleryDocuments) => {
					const pageTitle = `${extensionState.charAt(0).toUpperCase() + extensionState.slice(1)} - GAwesomeBot Extensions`;
					const extensionData = await Promise.all(galleryDocuments.map(getExtensionData));

					res.render("pages/extensions.ejs", {
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						isMaintainer: req.isAuthenticated() ? configJSON.maintainers.indexOf(req.user.id) > -1 : false,
						pageTitle,
						serverData,
						activeSearchQuery: req.query.id || req.query.q,
						mode: extensionState,
						rawCount,
						itemsPerPage: req.query.count,
						currentPage: page,
						numPages: Math.ceil(rawCount / (count === 0 ? rawCount : count)),
						extensions: extensionData,
						upvotedData: upvoted_gallery_extensions,
					});
				});
			});
		};

		if (req.isAuthenticated()) {
			const serverData = [];
			const usr = await bot.users.fetch(req.user.id, true);
			const addServerData = async (i, callback) => {
				if (req.user.guilds && i < req.user.guilds.length) {
					const svr = await getGuild.get(bot, req.user.guilds[i].id, { resolve: ["id"], members: ["id", "roles"], convert: { id_only: true } });
					if (svr && usr) {
						db.servers.findOne({ _id: svr.id }, (err, serverDocument) => {
							if (!err && serverDocument) {
								const member = svr.members[usr.id];
								if (bot.getUserBotAdmin(svr, serverDocument, member) >= 3) {
									serverData.push({
										name: req.user.guilds[i].name,
										id: req.user.guilds[i].id,
										icon: req.user.guilds[i].icon ? `https://cdn.discordapp.com/icons/${req.user.guilds[i].id}/${req.user.guilds[i].icon}.jpg` : "/static/img/discord-icon.png",
										prefix: serverDocument.config.command_prefix,
									});
								}
							}
							addServerData(++i, callback);
						});
					} else {
						addServerData(++i, callback);
					}
				} else {
					callback();
				}
			};
			addServerData(0, () => {
				serverData.sort((a, b) => a.name.localeCompare(b.name));
				db.users.findOne({ _id: req.user.id }, (err, userDocument) => {
					if (!err && userDocument) {
						renderPage(userDocument.upvoted_gallery_extensions, serverData);
					} else {
						renderPage([], serverData);
					}
				});
			});
		} else {
			renderPage();
		}
	});

	// My extensions
	app.get("/extensions/my", (req, res) => {
		if (req.isAuthenticated()) {
			db.gallery.find({
				owner_id: req.user.id,
			}, (err, galleryDocuments) => {
				res.render("pages/extensions.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					currentPage: req.path,
					pageTitle: "My GAwesomeBot Extensions",
					serverData: {
						id: req.user.id,
					},
					activeSearchQuery: req.query.q,
					mode: "my",
					rawCount: (galleryDocuments || []).length,
					extensions: galleryDocuments || [],
				});
			});
		} else {
			res.redirect("/login");
		}
	});
	io.of("/extensions/my").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/extensions/my", (req, res) => {
		if (req.isAuthenticated()) {
			db.gallery.find({
				owner_id: req.user.id,
			}, (err, galleryDocuments) => {
				if (!err && galleryDocuments) {
					res.redirect(req.originalUrl);
				} else {
					renderError(res, "Something went wrong while we tried to fetch your extensions.");
				}
			});
		} else {
			res.redirect("/login");
		}
	});

	const generateCodeID = code => require("crypto")
		.createHash("md5")
		.update(code, "utf8")
		.digest("hex");

	// Extension builder
	app.get("/extensions/builder", (req, res) => {
		if (req.isAuthenticated()) {
			const renderPage = extensionData => {
				res.render("pages/extensions.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					currentPage: req.path,
					pageTitle: `${extensionData.name ? `${extensionData.name} - ` : ""}GAwesomeBot Extension Builder`,
					serverData: {
						id: req.user.id,
					},
					activeSearchQuery: req.query.q,
					mode: "builder",
					extensionData,
					events: AllowedEvents,
				});
			};

			if (req.query.extid) {
				db.gallery.findOne({
					_id: req.query.extid,
					owner_id: req.user.id,
				}, (err, galleryDocument) => {
					if (!err && galleryDocument) {
						try {
							galleryDocument.code = fs.readFileSync(`${__dirname}/../Extensions/${galleryDocument.code_id}.gabext`);
						} catch (err) {
							galleryDocument.code = "";
						}
						renderPage(galleryDocument);
					} else {
						renderPage({});
					}
				});
			} else {
				renderPage({});
			}
		} else {
			res.redirect("/login");
		}
	});
	io.of("/extensions/builder").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	const validateExtensionData = data => ((data.type === "command" && data.key) || (data.type === "keyword" && data.keywords) || (data.type === "timer" && data.interval) || (data.type === "event" && data.event)) && data.code;
	const writeExtensionData = (extensionDocument, data) => {
		extensionDocument.name = data.name;
		extensionDocument.type = data.type;
		extensionDocument.key = data.type === "command" ? data.key : null;
		extensionDocument.keywords = data.type === "keyword" ? data.keywords.split(",") : null;
		extensionDocument.case_sensitive = data.type === "keyword" ? data.case_sensitive === "on" : null;
		extensionDocument.interval = data.type === "timer" ? data.interval : null;
		extensionDocument.usage_help = data.type === "command" ? data.usage_help : null;
		extensionDocument.extended_help = data.type === "command" ? data.extended_help : null;
		extensionDocument.event = data.type === "event" ? data.event : undefined;
		extensionDocument.last_updated = Date.now();
		extensionDocument.timeout = data.timeout;
		extensionDocument.code_id = generateCodeID(data.code);
		extensionDocument.scopes = [];
		Object.keys(data).forEach(val => {
			if (val.startsWith("scope_")) {
				extensionDocument.scopes.push(val.split("scope_")[1]);
			}
		});

		return extensionDocument;
	};
	app.post("/extensions/builder", (req, res) => {
		if (req.isAuthenticated()) {
			if (validateExtensionData(req.body)) {
				const sendResponse = isErr => {
					dashboardUpdate(req.path, req.user.id);
					if (isErr) return res.sendStatus(500);
					res.sendStatus(200);
				};
				const saveExtensionCode = (err, codeID) => {
					if (err) {
						winston.warn(`Failed to update settings at ${req.path}`, { usrid: req.user.id }, err);
						sendResponse(true);
					} else {
						writeFile(`${__dirname}/../Extensions/${codeID}.gabext`, req.body.code, () => {
							sendResponse();
						});
					}
				};
				const saveExtensionData = (galleryDocument, isUpdate) => {
					galleryDocument.level = "gallery";
					galleryDocument.state = "saved";
					galleryDocument.description = req.body.description;
					const oldName = galleryDocument.name;
					const oldID = galleryDocument.code_id;
					writeExtensionData(galleryDocument, req.body);

					if (!isUpdate) {
						galleryDocument.owner_id = req.user.id;
						dashboardUpdate("/extensions/my", req.user.id);
					} else {
						galleryDocument.versions.push({
							_id: oldName,
							code_id: oldID,
						});
						if (oldName === req.body.name) galleryDocument.name = `${galleryDocument.name} (2)`;
					}
					if (galleryDocument.validateSync()) {
						winston.warn("Failed to validate extension data", galleryDocument.validateSync());
						return sendResponse(true);
					}
					galleryDocument.save().catch(err => {
						winston.warn("Failed to save extension metadata: " + err);
						sendResponse(true);
					});
					saveExtensionCode(false, generateCodeID(req.body.code));
				};

				if (req.query.extid) {
					db.gallery.findOne({
						_id: req.query.extid,
						owner_id: req.user.id,
					}, (err, galleryDocument) => {
						if (!err && galleryDocument) {
							saveExtensionData(galleryDocument, true);
						} else {
							saveExtensionData(new db.gallery(), false);
						}
					});
				} else {
					saveExtensionData(new db.gallery(), false);
				}
			} else {
				renderError(res, "Failed to verify extension data!", undefined, 400);
			}
		} else {
			res.redirect("/login");
		}
	});

	// Download extension code
	app.get("/extensions/:extid", async (req, res) => {
		let extensionDocument;
		try {
			extensionDocument = await db.gallery.findOne({ _id: req.params.extid }).exec();
		} catch (err) {
			return res.sendStatus(500);
		}
		if (extensionDocument || extensionDocument.state === "saved") {
			try {
				res.set({
					"Content-Disposition": `${"attachment; filename='"}${extensionDocument.name}.gabext` + "'",
					"Content-Type": "text/javascript",
				});
				res.sendFile(path.resolve(`${__dirname}/../Extensions/${extensionDocument.code_id}.gabext`));
			} catch (err) {
				res.sendStatus(500);
			}
		} else {
			res.sendStatus(404);
		}
	});

	// Modify extensions
	app.post("/extensions/:extid/:action", async (req, res) => {
		if (req.isAuthenticated()) {
			if (req.params.extid && req.params.action) {
				if (["accept", "feature", "reject", "remove"].includes(req.params.action) && !configJSON.maintainers.includes(req.user.id)) {
					res.sendStatus(403);
					return;
				}

				const getGalleryDocument = async () => {
					let doc;
					try {
						doc = await db.gallery.findOne({_id: req.params.extid}).exec();
					} catch (err) {
						res.sendStatus(500);
						return false;
					}
					return doc;
				};
				const getUserDocument = async () => {
					let userDocument = await db.users.findOne({ _id: req.user.id });
					if (userDocument) {
						return userDocument;
					} else {
						// TODO: Gilbert, decide if this needs to be an error 500 or not!
						userDocument = await db.users.create(new Users({ _id: req.user.id }));
						return userDocument;
					}
				};
				const messageOwner = async (usrid, message) => {
					try {
						const usr = await bot.users.fetch(usrid, true);
						if (usr) {
							const ch = await usr.createDM();
							ch.send(message);
						}
					} catch (err) {}
				};

				const galleryDocument = await getGalleryDocument();
				if (!galleryDocument) return;
				switch (req.params.action) {
					case "upvote":
						const userDocument = await getUserDocument();
						const vote = userDocument.upvoted_gallery_extensions.indexOf(galleryDocument._id) === -1 ? 1 : -1;
						if (vote === 1) {
							userDocument.upvoted_gallery_extensions.push(galleryDocument._id);
						} else {
							userDocument.upvoted_gallery_extensions.splice(userDocument.upvoted_gallery_extensions.indexOf(galleryDocument._id), 1);
						}
						galleryDocument.points += vote;
						await galleryDocument.save();
						await userDocument.save();
						let ownerUserDocument = await db.users.findOne({ _id: galleryDocument.owner_id });
						if (!ownerUserDocument) ownerUserDocument = await db.users.create(new Users({ _id: gallery.owner_id }));
						ownerUserDocument.points += vote * 10;
						await ownerUserDocument.save();
						res.sendStatus(200);
						break;
					case "accept":
						messageOwner(galleryDocument.owner_id, {
							embed: {
								color: Colors.GREEN,
								title: `Your extension ${galleryDocument.name} has been accepted to the GAwesomeBot extension gallery! 🎉`,
								description: `View your creation [here](${configJS.hostingURL}extensions/gallery?id=${galleryDocument._id})!`,
							},
						});
						galleryDocument.state = "gallery";
						galleryDocument.save(err => {
							res.sendStatus(err ? 500 : 200);
							db.servers.find({
								extensions: {
									$elemMatch: {
										_id: galleryDocument._id,
									},
								},
							}, (err, serverDocuments) => {
								if (!err && serverDocuments) {
									serverDocuments.forEach(serverDocument => {
										serverDocument.extensions.id(galleryDocument._id).updates_available++;
										serverDocument.save(err => {
											if (err) {
												winston.error("Failed to save server data for extension update", { svrid: serverDocument._id }, err);
											}
										});
									});
								}
							});
						});
						break;
					case "feature":
						if (!galleryDocument.featured) {
							messageOwner(galleryDocument.owner_id, {
								embed: {
									color: Colors.GREEN,
									title: `Your extension ${galleryDocument.name} has been featured on the GAwesomeBot extension gallery! 🌟`,
									description: `View your achievement [here](${configJS.hostingURL}extensions/gallery?id=${galleryDocument._id})`,
								},
							});
						}
						galleryDocument.featured = galleryDocument.featured !== true;
						galleryDocument.save(err => {
							res.sendStatus(err ? 500 : 200);
						});
						break;
					case "reject":
					case "remove":
						messageOwner(galleryDocument.owner_id, {
							embed: {
								color: Colors.LIGHT_RED,
								title: `Your extension ${galleryDocument.name} has been ${req.params.action}${req.params.action === "reject" ? "e" : ""}d from the GAwesomeBot extension gallery`,
								description: `${req.body.reason.replace(/\\n/g, "\n")}`,
							},
						});
						const ownerUserDocument2 = await db.users.findOne({ _id: galleryDocument.owner_id });
						if (ownerUserDocument2) {
								ownerUserDocument2.points -= galleryDocument.points * 10;
								await ownerUserDocument2.save();
						}
						galleryDocument.state = "saved";
						galleryDocument.featured = false;
						galleryDocument.save(err => {
							res.sendStatus(err ? 500 : 200);
						});
						break;
					case "publish":
						if (galleryDocument.owner_id !== req.user.id) return res.sendStatus(404);
						galleryDocument.state = "queue";
						await galleryDocument.save();
						res.sendStatus(200);
						break;
					case "delete":
						if (galleryDocument.owner_id !== req.user.id) return res.sendStatus(404);
						await db.gallery.findByIdAndRemove(galleryDocument._id).exec();
						dashboardUpdate(req.path, req.user.id);
						try {
							fs.unlinkSync(`${__dirname}/../Extensions/${galleryDocument.code_id}.gabext`);
						} catch (err) {}
						res.sendStatus(200);
						break;
					case "unpublish":
						if (galleryDocument.owner_id !== req.user.id) return res.sendStatus(403);
						galleryDocument.state = "saved";
						galleryDocument.featured = false;
						await galleryDocument.save();
						res.sendStatus(200);
						break;
					default:
						res.sendStatus(400);
						break;
				}
			} else {
				res.sendStatus(400);
			}
		} else {
			res.sendStatus(403);
		}
	});

	// Blog (updates + announcements)
	const getBlogData = async blogDocument => {
		const author = await bot.users.fetch(blogDocument.author_id, true) || {
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
		const avatarURL = (await bot.users.fetch(blogDocument.author_id, true)).avatarURL();
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
	const getPageTitle = () => [
		"Dolphin Musings",
		"The Fault in Our Syntax",
		"How to Become Popular",
		"I wish I were a GAB",
		"A Robot's Thoughts",
		"My Meme Library",
		"Top 10 Prank Channels",
		"Why do we exist?",
		"What is Love?",
		"Updating GAB; My Story",
		"What did I ever do to you?",
		"Welcome back to",
		"BitQuote made this happen",
		"I didn't want this either",
		"The tragic story",
		"Developer Vs. Bot",
		"What did we mess up today?",
		"Where are your fingers?"
	][Math.floor(Math.random() * 17)]
	app.get("/blog", (req, res) => {
		let count;
		if (!req.query.count || isNaN(req.query.count)) {
			count = 4;
		} else {
			count = parseInt(req.query.count);
		}
		let page;
		if (!req.query.page || isNaN(req.query.page)) {
			page = 1;
		} else {
			page = parseInt(req.query.page);
		}

		db.blog.count({}, (err, rawCount) => {
			if (err || rawCount === null) {
				rawCount = 0;
			}

			db.blog.find({}).sort("-published_timestamp").skip(count * (page - 1)).limit(count).exec(async (err, blogDocuments) => {
				let blogPosts = [];
				if (!err && blogDocuments) {
					blogPosts = Promise.all(blogDocuments.map(async blogDocument => {
						const data = await getBlogData(blogDocument);
						data.isPreview = true;
						if (data.content.length > 1000) {
							data.content = `${data.content.slice(0, 1000)}...`;
						}
						data.content = md.makeHtml(data.content);
						return data;
					}));
				}
				res.render("pages/blog.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					isMaintainer: req.isAuthenticated() ? configJSON.maintainers.indexOf(req.user.id) > -1 : false,
					mode: "list",
					currentPage: page,
					numPages: Math.ceil(rawCount / (count === 0 ? rawCount : count)),
					pageTitle: "GAwesomeBot Blog",
					data: await blogPosts,
					headerTitle: getPageTitle(),
				});
			});
		});
	});
	app.get("/blog/compose", (req, res) => {
		if (req.isAuthenticated()) {
			if (configJSON.maintainers.indexOf(req.user.id) > -1) {
				const renderPage = data => {
					res.render("pages/blog.ejs", {
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						isMaintainer: true,
						pageTitle: `${data.title ? `Edit ${data.title}` : "New Post"} - GAwesomeBot Blog`,
						mode: "compose",
						data,
						headerTitle: getPageTitle(),
					});
				};

				if (req.query.id) {
					db.blog.findOne({ _id: req.query.id }, (err, blogDocument) => {
						if (err || !blogDocument) {
							renderPage({});
						} else {
							renderPage({
								id: blogDocument._id,
								title: blogDocument.title,
								category: blogDocument.category,
								content: blogDocument.content,
							});
						}
					});
				} else {
					renderPage({});
				}
			} else {
				renderError(res, "You must be a maintainer to access this page!", "<strong>Hey</strong>! Don't think I didn't see you!");
			}
		} else {
			res.redirect("/login");
		}
	});
	app.post("/blog/compose", (req, res) => {
		if (req.isAuthenticated()) {
			if (configJSON.maintainers.indexOf(req.user.id) > -1) {
				if (req.query.id) {
					db.blog.findOne({ _id: req.query.id }, (err, blogDocument) => {
						if (err || !blogDocument) {
							renderError(res, "Sorry, that blog post was not found.");
						} else {
							blogDocument.title = req.body.title;
							blogDocument.category = req.body.category;
							blogDocument.content = req.body.content;

							blogDocument.save(() => {
								res.redirect(`/blog/${blogDocument._id}`);
							});
						}
					});
				} else {
					const blogDocument = new db.blog({
						title: req.body.title,
						author_id: req.user.id,
						category: req.body.category,
						content: req.body.content,
					});
					blogDocument.save(() => {
						res.redirect(`/blog/${blogDocument._id}`);
					});
				}
			} else {
				renderError(res, "Cool maintainer dudes only.", "<strong>You!</strong> I demand you to stop!");
			}
		} else {
			res.redirect("/login");
		}
	});
	app.get("/blog/:id", (req, res) => {
		db.blog.findOne({
			_id: req.params.id,
		}, async (err, blogDocument) => {
			if (err || !blogDocument) {
				renderError(res, "Sorry, that blog doesn't exist!");
			} else {
				const data = await getBlogData(blogDocument);
				const getReactionCount = value => blogDocument.reactions.reduce((count, reactionDocument) => count + (reactionDocument.value === value), 0);
				data.reactions = {};
				[-1, 0, 1].forEach(reaction => {
					data.reactions[reaction] = getReactionCount(reaction);
				});
				if (req.isAuthenticated()) {
					data.userReaction = blogDocument.reactions.id(req.user.id) || {};
				}
				data.content = md.makeHtml(data.content);
				res.render("pages/blog.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					isMaintainer: req.isAuthenticated() ? configJSON.maintainers.indexOf(req.user.id) > -1 : false,
					mode: "article",
					pageTitle: `${blogDocument.title} - GAwesomeBot Blog`,
					blogPost: data,
					headerTitle: getPageTitle(),
				});
			}
		});
	});
	app.post("/blog/:id/react", (req, res) => {
		if (req.isAuthenticated()) {
			db.blog.findOne({ _id: req.params.id }, (err, blogDocument) => {
				if (err || !blogDocument) {
					res.sendStatus(500);
				} else {
					req.query.value = parseInt(req.query.value);

					const userReactionDocument = blogDocument.reactions.id(req.user.id);
					if (userReactionDocument) {
						if (userReactionDocument.value === req.query.value) {
							userReactionDocument.remove();
						} else {
							userReactionDocument.value = req.query.value;
						}
					} else {
						blogDocument.reactions.push({
							_id: req.user.id,
							value: req.query.value,
						});
					}

					blogDocument.save(err => {
						res.sendStatus(err ? 500 : 200);
					});
				}
			});
		} else {
			res.sendStatus(403);
		}
	});
	app.post("/blog/:id/delete", (req, res) => {
		if (req.isAuthenticated()) {
			if (configJSON.maintainers.indexOf(req.user.id) > -1) {
				db.blog.findByIdAndRemove(req.params.id, err => {
					res.sendStatus(err ? 500 : 200);
				});
			} else {
				renderError(res, "Only maintainers are allowed in this club.", "<strong>Hey</strong> you! Stop right there!");
			}
		} else {
			res.redirect("/login");
		}
	});

	// Wiki page (documentation)
	app.get("/wiki", (req, res) => {
		db.wiki.find({}).sort({
			_id: 1,
		}).exec((err, wikiDocuments) => {
			if (err || !wikiDocuments) {
				renderError(res, "An error occurred while fetching wiki documents.");
			} else if (req.query.q) {
				req.query.q = req.query.q.toLowerCase().trim();

				const searchResults = [];
				wikiDocuments.forEach(wikiDocument => {
					const titleMatch = wikiDocument._id.toLowerCase().indexOf(req.query.q);
					const content = removeMd(wikiDocument.content);
					const contentMatch = content.toLowerCase().indexOf(req.query.q);

					if (titleMatch > -1 || contentMatch > -1) {
						let matchText;
						if (contentMatch) {
							const startIndex = contentMatch < 300 ? 0 : contentMatch - 300;
							const endIndex = contentMatch > content.length - 300 ? content.length : contentMatch + 300;
							matchText = `${content.substring(startIndex, contentMatch)}<strong>${content.substring(contentMatch, contentMatch + req.query.q.length)}</strong>${content.substring(contentMatch + req.query.q.length, endIndex)}`;
							if (startIndex > 0) {
								matchText = `...${matchText}`;
							}
							if (endIndex < content.length) {
								matchText += "...";
							}
						} else {
							matchText = content.slice(0, 300);
							if (content.length > 300) {
								matchText += "...";
							}
						}
						searchResults.push({
							title: wikiDocument._id,
							matchText,
						});
					}
				});

				res.render("pages/wiki.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					isContributor: req.isAuthenticated() ? configJSON.wikiContributors.indexOf(req.user.id) > -1 || configJSON.maintainers.indexOf(req.user.id) > -1 : false,
					pageTitle: `Search for "${req.query.q}" - GAwesomeBot Wiki`,
					pageList: wikiDocuments.map(wikiDocument => wikiDocument._id),
					mode: "search",
					data: {
						title: req.query.q ? `Search for "${req.query.q}"` : "List of all pages",
						activeSearchQuery: req.query.q,
						searchResults,
					},
				});
			} else {
				res.redirect("/wiki/Home");
			}
		});
	});
	app.get("/wiki/edit", (req, res) => {
		if (req.isAuthenticated()) {
			if (configJSON.wikiContributors.indexOf(req.user.id) > -1 || configJSON.maintainers.indexOf(req.user.id) > -1) {
				const renderPage = data => {
					res.render("pages/wiki.ejs", {
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						pageTitle: `${data.title ? `Edit ${data.title}` : "New Page"} - GAwesomeBot Wiki`,
						mode: "edit",
						data,
					});
				};

				if (req.query.id) {
					db.wiki.findOne({ _id: req.query.id }, (err, wikiDocument) => {
						if (err || !wikiDocument) {
							renderPage({
								title: req.query.id,
							});
						} else {
							renderPage({
								title: wikiDocument._id,
								content: wikiDocument.content,
							});
						}
					});
				} else {
					renderPage({});
				}
			} else {
				renderError(res, "Hah! You thought you could fool me? Maintainers only!", "<strong>You</strong> shall not pass!");
			}
		} else {
			res.redirect("/login");
		}
	});
	app.post("/wiki/edit", (req, res) => {
		if (req.isAuthenticated()) {
			if (configJSON.wikiContributors.indexOf(req.user.id) > -1 || configJSON.maintainers.indexOf(req.user.id) > -1) {
				if (req.query.id) {
					db.wiki.findOne({ _id: req.query.id }, (err, wikiDocument) => {
						if (err || !wikiDocument) {
							renderError(res, "An error occurred while saving wiki documents!");
						} else {
							wikiDocument.updates.push({
								_id: req.user.id,
								diff: diff.prettyHtml(diff.main(wikiDocument.content, req.body.content).filter(a => a[0] !== 0)),
							});
							wikiDocument.content = req.body.content;

							wikiDocument.save(async () => {
								res.redirect(`/wiki/${wikiDocument._id}`);
							});
						}
					});
				} else {
					const wikiDocument = new db.wiki({
						_id: req.body.title,
						content: req.body.content,
						updates: [{
							_id: req.user.id,
						}],
					});
					wikiDocument.save(() => {
						res.redirect(`/wiki/${wikiDocument._id}`);
					});
				}
			} else {
				renderError(res, "Only maintainers are allowed to post on me.");
			}
		} else {
			res.redirect("/login");
		}
	});
	app.get("/wiki/:id", (req, res) => {
		db.wiki.find({}).sort({
			_id: 1,
		}).exec((err, wikiDocuments) => {
			if (err || !wikiDocuments) {
				renderError(res, "Failed to fetch wiki pages!");
			} else {
				const page = wikiDocuments.find(wikiDocument => wikiDocument._id === req.params.id) || {
					_id: req.params.id,
				};
				const getReactionCount = value => page.reactions.reduce((count, reactionDocument) => count + (reactionDocument.value === value), 0);
				let reactions, userReaction;
				if (page.updates && page.reactions) {
					reactions = {
						"-1": getReactionCount(-1),
						1: getReactionCount(1),
					};
					if (req.isAuthenticated()) {
						userReaction = page.reactions.id(req.user.id) || {};
					}
				}
				res.render("pages/wiki.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					isContributor: req.isAuthenticated() ? configJSON.wikiContributors.indexOf(req.user.id) > -1 || configJSON.maintainers.indexOf(req.user.id) > -1 : false,
					pageTitle: `${page._id} - GAwesomeBot Wiki`,
					pageList: wikiDocuments.map(wikiDocument => wikiDocument._id),
					mode: "page",
					data: {
						title: page._id,
						content: md.makeHtml(page.content),
						reactions,
						userReaction,
					},
				});
			}
		});
	});
	app.get("/wiki/:id/history", (req, res) => {
		db.wiki.find({}).sort({
			_id: 1,
		}).exec(async (err, wikiDocuments) => {
			if (err || !wikiDocuments) {
				renderError(res, "Failed to fetch wiki data!");
			} else {
				const page = wikiDocuments.find(wikiDocument => wikiDocument._id === req.params.id) || {
					_id: req.params.id,
				};
				let updates;
				if (page.updates && page.reactions) {
					updates = page.updates.map(async updateDocument => {
						const author = await bot.users.fetch(updateDocument._id, true) || {
							id: "invalid-user",
							username: "invalid-user",
						};
						return {
							responsibleUser: {
								name: author.username,
								id: author.id,
								avatar: author.avatarURL() || "/static/img/discord-icon.png",
							},
							relativeTimestamp: moment(updateDocument.timestamp).fromNow(),
							rawTimestamp: moment(updateDocument.timestamp).format(configJS.moment_date_format),
							diffHtml: updateDocument.diff,
						};
					});
					updates = await Promise.all(updates);
				}
				res.render("pages/wiki.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					isContributor: req.isAuthenticated() ? configJSON.wikiContributors.indexOf(req.user.id) > -1 || configJSON.maintainers.indexOf(req.user.id) > -1 : false,
					pageTitle: `Edit history for ${page._id} - GAwesomeBot Wiki`,
					pageList: wikiDocuments.map(wikiDocument => wikiDocument._id),
					mode: "history",
					data: {
						title: `Edit history for ${page._id}`,
						updates,
					},
				});
			}
		});
	});
	app.post("/wiki/:id/react", (req, res) => {
		if (req.isAuthenticated()) {
			db.wiki.findOne({ _id: req.params.id }, (err, wikiDocument) => {
				if (err || !wikiDocument) {
					res.sendStatus(500);
				} else {
					req.query.value = parseInt(req.query.value);

					const userReactionDocument = wikiDocument.reactions.id(req.user.id);
					if (userReactionDocument) {
						if (userReactionDocument.value === req.query.value) {
							userReactionDocument.remove();
						} else {
							userReactionDocument.value = req.query.value;
						}
					} else {
						wikiDocument.reactions.push({
							_id: req.user.id,
							value: req.query.value,
						});
					}

					wikiDocument.save(err => {
						res.sendStatus(err ? 500 : 200);
					});
				}
			});
		} else {
			res.sendStatus(403);
		}
	});
	app.post("/wiki/:id/delete", (req, res) => {
		if (req.isAuthenticated()) {
			if (configJSON.maintainers.indexOf(req.user.id) > -1) {
				db.wiki.findByIdAndRemove(req.params.id, err => {
					res.sendStatus(err ? 500 : 200);
				});
			} else {
				renderError(res, "You should know this by now. You're not a maintainer.", "<strong>Get</strong> out of here now!");
			}
		} else {
			res.redirect("/login");
		}
	});

	// Donation options
	app.get("/donate", (req, res) => {
		res.render("pages/donate.ejs", {
			authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
			charities: configJS.donateCharities,
			donate_subtitle: configJS.donateSubtitle,
		});
	});

	// Save serverDocument after admin console form data is received
	const saveAdminConsoleOptions = async (consolemember, svr, serverDocument, req, res, override) => {
		if (serverDocument.validateSync()) return renderError(res, "Your request is malformed.", null, 400);
		try {
			bot.logMessage(serverDocument, LoggingLevels.SAVE, `Changes were saved in the Admin Console at section ${req.path}.`, null, consolemember.id);
			dashboardUpdate(req.path, svr.id);
			await serverDocument.save();
			bot.IPC.send("cacheUpdate", { guild: serverDocument._id });
			if (override) {
				res.sendStatus(200);
			} else {
				res.redirect(req.originalUrl);
			}
		} catch (err) {
			winston.warn(`Failed to update admin console settings at ${req.path} '-'`, { svrid: svr.id, usrid: consolemember.id }, err);
			renderError(res, "An internal error occurred!");
			return;
		}
	};

	// Save config.json after maintainer console form data is received
	const saveMaintainerConsoleOptions = (consolemember, req, res, override, silent) => {
		fsn.writeJSONAtomic(`${__dirname}/../Configurations/config.json`, configJSON, { spaces: 2 })
			.then(() => {
				dashboardUpdate(req.path, "maintainer");
				if (override && !silent) {
					res.sendStatus(200);
				} else if (!silent) res.redirect(req.originalUrl);
			})
			.catch(err => {
				winston.error(`Failed to update maintainer settings at ${req.path} '-'`, { usrid: consolemember.id }, err);
				renderError(res, "An internal error occurred!");
				return;
			});
	};

	// Login to admin console
	app.get("/login", passport.authenticate("discord", {
		scope: discordOAuthScopes,
	}));

	// Callback for Discord OAuth2
	app.get("/login/callback", passport.authenticate("discord", {
		failureRedirect: "/error?err=discord",
	}), (req, res) => {
		if (configJSON.userBlocklist.indexOf(req.user.id) > -1 || req.user.verified === false) {
			req.session.destroy(err => {
				if (!err) renderError(res, "Your Discord account must have a verified email.", "<strong>Hah!</strong> Thought you were close, didn'tcha?");
				else renderError(res, "Failed to destroy your session.");
			});
		} else {
			res.redirect("/dashboard");
		}
	});

	// Admin console support for legacy URL's
	app.use("/dashboard", (req, res, next) => {
		if (req.query.svrid) {
			res.redirect(307, `/dashboard/${req.query.svrid}${req.path}`);
		} else next();
	});

	// Admin console dashboard
	app.get("/dashboard", async (req, res) => {
		if (!req.isAuthenticated()) {
			res.redirect("/login");
		} else {
			const serverData = [];
			const usr = await bot.users.fetch(req.user.id, true);
			const addServerData = async (i, callback) => {
				if (req.user.guilds && i < req.user.guilds.length) {
					const svr = await getGuild.get(bot, req.user.guilds[i].id, { members: ["id", "roles"], convert: { id_only: true } });
					if (!svr && !((parseInt(req.user.guilds[i].permissions) >> 5) & 1)) {
						addServerData(++i, callback);
						return;
					}
					const data = {
						name: req.user.guilds[i].name,
						id: req.user.guilds[i].id,
						icon: req.user.guilds[i].icon ? `https://cdn.discordapp.com/icons/${req.user.guilds[i].id}/${req.user.guilds[i].icon}.jpg` : "/static/img/discord-icon.png",
						botJoined: svr !== null,
						isAdmin: false,
					};
					if (svr && usr) {
						db.servers.findOne({ _id: req.user.guilds[i].id }, (err, serverDocument) => {
							if (!err && serverDocument) {
								const member = svr.members[usr.id];
								if (bot.getUserBotAdmin(svr, serverDocument, member) >= 3 || checkPerms(req.path, usr.id, "dashboard")) {
									data.isAdmin = true;
								}
							}
							serverData.push(data);
							addServerData(++i, callback);
						});
					} else {
						serverData.push(data);
						addServerData(++i, callback);
					}
				} else {
					callback();
				}
			};
			addServerData(0, () => {
				serverData.sort((a, b) => a.name.localeCompare(b.name));
				if (configJSON.maintainers.indexOf(req.user.id) > -1) {
					serverData.push({
						name: "Maintainer Console",
						id: "maintainer",
						icon: "/static/img/transparent.png",
						botJoined: true,
						isAdmin: true,
					});
				}
				res.render("pages/dashboard.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					serverData,
					rawJoinLink: `https://discordapp.com/oauth2/authorize?&client_id=${auth.discord.clientID}&scope=bot&permissions=470019135`,
				});
			});
		}
	});

	// Admin console overview (home)
	app.get("/dashboard/:svrid/overview", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			// Redirect to maintainer console if necessary
			if (!svr) {
				res.redirect("/dashboard/maintainer/maintainer");
			} else {
				let topCommand;
				let topCommandUsage = 0;
				for (const cmd in serverDocument.command_usage) {
					if (serverDocument.command_usage[cmd] > topCommandUsage) {
						topCommand = cmd;
						topCommandUsage = serverDocument.command_usage[cmd];
					}
				}
				const topMemberID = serverDocument.members.sort((a, b) => b.messages - a.messages)[0];
				const topMember = svr.members[topMemberID ? topMemberID._id : null];
				const memberIDs = Object.values(svr.members).map(a => a.id);
				db.users.find({
					_id: {
						$in: memberIDs,
					},
				}).sort({
					points: -1,
				}).limit(1).exec((err, userDocuments) => {
					let richestMember;
					if (!err && userDocuments && userDocuments.length > 0) {
						richestMember = svr.members[userDocuments[0]._id];
					}
					const topGame = serverDocument.games.sort((a, b) => b.time_played - a.time_played)[0];
					res.render("pages/admin-overview.ejs", {
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        		sudoMode: adminLvl !== 3,
						serverData: {
							name: svr.name,
							id: svr.id,
							icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
							owner: {
								username: svr.members[svr.ownerID].user.username,
								id: svr.members[svr.ownerID].id,
								avatar: bot.getAvatarURL(svr.members[svr.ownerID].id, svr.members[svr.ownerID].user.avatar) || "/static/img/discord-icon.png",
							},
						},
						currentPage: req.path,
						messagesToday: serverDocument.messages_today,
						topCommand,
						memberCount: Object.keys(svr.members).length,
						topMember: topMember ? {
							username: topMember.user.username,
							id: topMember.id,
							avatar: bot.getAvatarURL(topMember.id, topMember.user.avatar) || "/static/img/discord-icon.png",
						} : null,
						topGame: topGame ? topGame._id : null,
						richestMember: richestMember ? {
							username: richestMember.user.username,
							id: richestMember.id,
							avatar: bot.getAvatarURL(richestMember.id, richestMember.user.avatar) || "/static/img/discord-icon.png",
						} : null,
					});
				});
			}
		});
	});

	// Admin console command options
	app.get("/dashboard/:svrid/commands/command-options", (req, res) => {
		checkAuth(req, res, async (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-command-options.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				currentPage: req.path,
				configData: {
					chatterbot: serverDocument.config.chatterbot,
					command_cooldown: serverDocument.config.command_cooldown,
					command_fetch_properties: serverDocument.config.command_fetch_properties,
					command_prefix: serverDocument.config.command_prefix,
					delete_command_messages: serverDocument.config.delete_command_messages,
					ban_gif: serverDocument.config.ban_gif,
				},
				channelData: getChannelData(svr),
				botName: svr.members[bot.user.id].nickname || bot.user.username,
			});
		});
	});
	io.of("/dashboard/commands/command-options").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/commands/command-options", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body.command_prefix !== bot.getCommandPrefix(svr, serverDocument)) {
				serverDocument.config.command_prefix = req.body.command_prefix;
			}
			serverDocument.config.delete_command_messages = req.body.delete_command_messages === "on";
			serverDocument.config.chatterbot.isEnabled = req.body["chatterbot-isEnabled"] === "on";
			serverDocument.config.ban_gif = req.body["ban_gif"];
			if (req.body["ban_gif"] === "Default") serverDocument.config.ban_gif = "https://imgur.com/3QPLumg.gif";
			if (req.body["chatterbot-isEnabled"] === "on") {
				const channels = getChannelData(svr).map(ch => ch.id);
				const enabledChannels = Object.keys(req.body).filter(key => key.startsWith("chatterbot_enabled_channel_ids")).map(chstring => chstring.split("-")[1]);
				channels.forEach(ch => {
					if (!enabledChannels.some(id => ch === id)) {
						serverDocument.config.chatterbot.disabled_channel_ids.push(ch);
					} else if (serverDocument.config.chatterbot.disabled_channel_ids.indexOf(ch) > -1) {
						serverDocument.config.chatterbot.disabled_channel_ids = serverDocument.config.chatterbot.disabled_channel_ids.filter(svrch => ch !== svrch);
					}
				});
			}
			serverDocument.config.command_cooldown = parseInt(req.body.command_cooldown) > 120000 || isNaN(parseInt(req.body.command_cooldown)) ? 0 : parseInt(req.body.command_cooldown);
			serverDocument.config.command_fetch_properties.default_count = isNaN(parseInt(req.body.default_count)) ? serverDocument.config.command_fetch_properties.default_count : parseInt(req.body.default_count);
			serverDocument.config.command_fetch_properties.max_count = isNaN(parseInt(req.body.max_count)) ? serverDocument.config.command_fetch_properties.max_count : parseInt(req.body.max_count);

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res, true);
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
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
          sudoMode: adminLvl !== 3,
					serverData: {
						name: svr.name,
						id: svr.id,
						icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
					},
					currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
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
			res.render("pages/admin-admins.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr).filter(role => serverDocument.config.admins.id(role.id) === null),
				currentPage: req.path,
				configData: {
					admins: serverDocument.config.admins.filter(adminDocument => svr.roles.hasOwnProperty(adminDocument._id)).map(adminDocument => {
						adminDocument.name = svr.roles[adminDocument._id].name;
						return adminDocument;
					}),
					auto_add_admins: serverDocument.config.auto_add_admins,
				},
			});
		});
	});
	io.of("/dashboard/administration/admins").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/:svrid/administration/admins", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			if (req.body["new-role_id"] && req.body["new-level"] && !serverDocument.config.admins.id(req.body["new-role_id"])) {
				let level = parseInt(req.body["new-level"]);
				if (isNaN(level) || level > 3 || level < 1) level = 1;
				serverDocument.config.admins.push({
					_id: req.body["new-role_id"],
					level: level,
				});
			} else {
				for (let i = 0; i < serverDocument.config.admins.length; i++) {
					if (req.body[`admin-${i}-removed`]) {
						serverDocument.config.admins[i] = null;
					}
				}
				serverDocument.config.admins.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console moderation
	app.get("/dashboard/:svrid/administration/moderation", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument, adminLvl) => {
			res.render("pages/admin-moderation.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons"),
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				voiceChannelData: getChannelData(svr, "voice"),
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: req.path,
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
					sudoMode: adminLvl !== 3,
					serverData: {
						name: svr.name,
						id: svr.id,
						icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
					},
					channelData: getChannelData(svr),
					currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
				},
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons") || "/static/img/discord-icon.png",
					defaultChannel: defaultChannel.name,
				},
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: bot.getAvatarURL(svr.id, svr.icon, "icons"),
				},
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png",
				},
				currentPage: req.path,
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
        sudoMode: adminLvl !== 3,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png",
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
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
					currentPage: req.path,
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
					currentPage: req.path,
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
				currentPage: req.path,
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
				currentPage: req.path,
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
				currentPage: req.path,
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
				currentPage: req.path,
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
				currentPage: req.path,
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
				currentPage: req.path,
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
				currentPage: req.path,
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
				currentPage: req.path,
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
				currentPage: req.path,
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
					currentPage: req.path,
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

	// 503 testing page
	app.get("/503", (req, res) => {
		res.render("pages/503.ejs");
	});

	// Logout of admin console
	app.get("/logout", (req, res) => {
		req.logout();
		res.redirect("/activity");
	});

	// Error page
	app.get("/error", (req, res) => {
		if (req.query.err === "discord") renderError(res, "The Discord OAuth flow could not be completed.");
		else if (req.query.err === "json") renderError(res, "That doesn't look like a valid trivia set to me!");
		else renderError(res, "I AM ERROR");
	});

	// 404 page
	app.use((req, res, next) => {
		res.status(404).render("pages/404.ejs");
	});

	// Handle errors (redirect to error page)
	app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
		winston.warn(`An error occurred during a ${req.protocol} ${req.method} request on ${req.path} 0.0\n`, error, { params: req.params, query: req.query });
		renderError(res, "An unexpected and unknown error occurred!<br>Please contact your GAB maintainer for support.");
	});
};
