const express = require("express");
const https = require("https");
const compression = require("compression");
const sio = require("socket.io");
const bodyParser = require("body-parser");
const RateLimit = require("express-rate-limit");
const ejs = require("ejs");
const session = require("express-session");
const mongooseSessionStore = require("connect-mongo")(session);
const passport = require("passport");
const passportSocketIo = require("passport.socketio");
const discordStrategy = require("passport-discord").Strategy;
const discordOAuthScopes = ["identify", "guilds"];
const path = require("path");
const fs = require("fs");
const writeFile = require("write-file-atomic");
const base64 = require("node-base64-image");
const sizeof = require("object-sizeof");
const moment = require("moment");
const textDiff = require("text-diff");
const diff = new textDiff();
const unirest = require("unirest");

const showdown = require("showdown");
const md = new showdown.Converter({
	tables: true,
	simplifiedAutoLink: true,
	strikethrough: true,
	tasklists: true,
	smoothLivePreview: true,
	smartIndentationFix: true
});
const xssFilters = require("xss-filters");
const removeMd = require("remove-markdown");

const database = require("./../Database/Driver.js");
const createMessageOfTheDay = require("./../Modules/MessageOfTheDay.js");
const Giveaways = require("./../Modules/Giveaways.js");
const Lotteries = require("./../Modules/Lotteries.js");
const Polls = require("./../Modules/Polls.js");
const Trivia = require("./../Modules/Trivia.js");
const Updater = require("./../Modules/Updater.js")

const app = express();
app.use(compression());
app.enable("trust proxy");
app.use(bodyParser.urlencoded({
	extended: true,
	parameterLimit: 10000,
	limit: "5mb"
}));
app.use(bodyParser.json({
	parameterLimit: 10000,
	limit: "5mb"
}));
app.set("json spaces", 2);

app.engine("ejs", ejs.renderFile);
app.set("views", `${__dirname}/views`);
app.set("view engine", "ejs");

const findQueryUser = (query, list) => {
	let usr = list.get(query);
	if(!usr) {
		const usernameQuery = query.substring(0, query.lastIndexOf("#")>-1 ? query.lastIndexOf("#") : query.length);
		const discriminatorQuery = query.indexOf("#")>-1 ? query.substring(query.lastIndexOf("#")+1) : "";
		const usrs = list.filter(a => {
			return (a.user || a).username==usernameQuery;
		});
		if(discriminatorQuery) {
			usr = usrs.find(a => {
				return (a.user || a).discriminator==discriminatorQuery;
			});
		} else if(usrs.length>0) {
			usr = usrs[0];
		}
	}
	return usr;
};

const getUserList = list => {
	return list.filter(usr => {
		return usr.bot!=true;
	}).map(usr => {
		return `${usr.username}#${usr.discriminator}`;
	}).sort();
};

const getChannelData = (svr, type) => {
	return svr.channels.filter(ch => {
		return ch.type==(type || 0);
	}).map(ch => {
		return {
			name: ch.name,
			id: ch.id,
			position: ch.position
		};
	}).sort((a, b) => {
		return a.position - b.position;
	});
};

const getRoleData = svr => {
	return svr.roles.filter(role => {
		return role.name!="@everyone" && role.name.indexOf("color-")!=0;
	}).map(role => {
		const color = role.color.toString(16);
		return {
			name: role.name,
			id: role.id,
			color: "000000".substring(0, 6 - color.length) + color,
			position: role.position
		};
	}).sort((a, b) => {
		return b.position - a.position;
	});
};

const getAuthUser = user => {
	return {
		username: user.username,
		id: user.id,
		avatar: user.avatar ? (`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg`) : "/static/img/discord-icon.png"
	};
};

const getRoundedUptime = uptime => {
	return uptime>86400 ? (`${Math.floor(uptime/86400)}d`) : (`${Math.floor(uptime/3600)}h`);
};

// Setup the web server
module.exports = (bot, db, auth, config, winston) => {
	// Setup passport and express-session
	passport.use(new discordStrategy({
		clientID: auth.platform.client_id,
		clientSecret: auth.platform.client_secret,
		callbackURL: `${config.hosting_url}login/callback`,
		scope: discordOAuthScopes
	}, (accessToken, refreshToken, profile, done) => {
		process.nextTick(() => {
			return done(null, profile);
		});
	}));
	passport.serializeUser((user, done) => {
		done(null, user);
	});
	passport.deserializeUser((id, done) => {
		done(null, id);
	});
	const sessionStore = new mongooseSessionStore({
		mongooseConnection: database.getConnection()
	});
	app.use(session({
		secret: "vFEvmrQl811q2E8CZelg4438l9YFwAYd",
		resave: false,
		saveUninitialized: false,
		store: sessionStore
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
		if (config.isUpdating) {
			res.status(503).render('pages/503.ejs', {})
		}	else {
			next()
		}
	});

	// Server public dir if necessary
	if(config.serve_static) {
		app.use("/static", express.static(`${__dirname}/public`));
	}

	// Handle errors (redirect to error page)
	app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
		winston.error(error);
		res.sendStatus(500);
		res.render("pages/error.ejs", {error});
	});

	// Open web interface
	function requireHTTPS(req, res, next) {
  	if (!req.secure) {
    	return res.redirect('https://'+ req.hostname + ":" + config.httpsPort + req.url);
    }
    next();
	}
	if (config.cert && config.privKey && config.httpsPort) {
		if (config.httpsRedirect) {
			app.use(requireHTTPS);
		}
		const privKey = fs.readFileSync(config.privKey, "utf8", function(err) {if (err) winston.error(err)})
		const cert = fs.readFileSync(config.cert, "utf8", function(err) {if (err) winston.error(err)})
		const credentials = {
			key: privKey,
			cert: cert
		}
		var httpsServer = https.createServer(credentials, app)
		httpsServer.listen(config.httpsPort, () => {
			winston.info(`Opened https web interface on ${config.server_ip}:${config.httpsPort}`);
		});
	}
	const server = app.listen(config.httpPort, config.server_ip, () => {
		winston.info(`Opened http web interface on ${config.server_ip}:${config.httpPort}`);
		process.setMaxListeners(0);
	});

	// Setup socket.io for dashboard
	const io = sio(server);
	io.use(passportSocketIo.authorize({
		key: "connect.sid",
		secret: "vFEvmrQl811q2E8CZelg4438l9YFwAYd",
		store: sessionStore,
		passport
	}));

	// Landing page
	app.get("/", (req, res) => {
		const uptime = process.uptime();
		res.render("pages/landing.ejs", {
			authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
			bannerMessage: config.homepage_message_html,
			rawServerCount: bot.guilds.size,
			roundedServerCount: Math.floor(bot.guilds.size/100)*100,
			rawUserCount: `${Math.floor(bot.users.size/1000)}K`,
			rawUptime: moment.duration(uptime, "seconds").humanize(),
			roundedUptime: getRoundedUptime(uptime)
		});
	});

	// Add to server link
	app.get("/add", (req, res) => {
		res.redirect(config.oauth_link);
	});

	// AwesomeBot data API
	app.use("/api/", new RateLimit({
		windowMs: 3600000,	// 150 requests/per hr
		max: 150,
		delayMs: 0
	}));
	app.get("/api", (req, res) => {
		res.json({
			server_count: bot.guilds.size,
			user_count: bot.users.size
		});
	});
	const getServerData = serverDocument => {
		let data;
		const svr = bot.guilds.get(serverDocument._id);
		if(svr) {
			const owner = svr.members.get(svr.ownerID);
			data = {
				name: svr.name,
				id: svr.id,
				icon: svr.iconURL || "/static/img/discord-icon.png",
				owner: {
					username: owner.user.username,
					id: owner.id,
					avatar: owner.user.avatarURL || "/static/img/discord-icon.png",
					name: owner.nick || owner.user.username
				},
				members: svr.members.size,
				messages: serverDocument.messages_today,
				rawCreated: moment(svr.createdAt).format(config.moment_date_format),
				relativeCreated: Math.ceil((Date.now() - svr.createdAt)/86400000),
				command_prefix: bot.getCommandPrefix(svr, serverDocument),
				category: serverDocument.config.public_data.server_listing.category,
				description: serverDocument.config.public_data.server_listing.isEnabled ? (md.makeHtml(xssFilters.inHTMLData(serverDocument.config.public_data.server_listing.description || "No description provided."))) : null,
				invite_link: serverDocument.config.public_data.server_listing.isEnabled ? (serverDocument.config.public_data.server_listing.invite_link || "javascript:alert('Invite link not available');") : null
			};
		}
		return data;
	};
	app.get("/api/servers", (req, res) => {
		const params = {
			"config.public_data.isShown": true
		};
		if(req.query.id) {
			params._id = req.query.id;
		}
		db.servers.find(params).skip(req.query.start ? parseInt(req.query.start) : 0).limit(req.query.count ? parseInt(req.query.count) : bot.guilds.size).exec((err, serverDocuments) => {
			if(!err && serverDocuments) {
				const data = serverDocuments.map(serverDocument => {
					return getServerData(serverDocument) || serverDocument._id;
				});
				res.json(data);
			} else {
				res.sendStatus(400);
			}
		});
	});
	const getUserData = (usr, userDocument) => {
		const sampleMember = bot.getFirstMember(usr);
		const mutualServers = bot.guilds.filter(svr => {
			return svr.members.has(usr.id);
		}).sort((a, b) => {
			return a.name.localeCompare(b.name);
		});
		const userProfile = {
			username: usr.username,
			discriminator: usr.discriminator,
			avatar: usr.avatarURL || "/static/img/discord-icon.png",
			id: usr.id,
			status: sampleMember.status,
			game: bot.getGame(sampleMember),
			roundedAccountAge: moment(usr.createdAt).fromNow(),
			rawAccountAge: moment(usr.createdAt).format(config.moment_date_format),
			backgroundImage: userDocument.profile_background_image || "http://i.imgur.com/8UIlbtg.jpg",
			points: userDocument.points || 1,
			lastSeen: userDocument.last_seen ? moment(userDocument.last_seen).fromNow() : null,
			rawLastSeen: userDocument.last_seen ? moment(userDocument.last_seen).format(config.moment_date_format) : null,
			mutualServerCount: mutualServers.length,
			pastNameCount: (userDocument.past_names || {}).length || 0,
			isAfk: userDocument.afk_message!=null && userDocument.afk_message!="",
			mutualServers: []
		};
		switch(userProfile.status) {
			case "online":
				userProfile.statusColor = "is-success";
				break;
			case "idle":
			case "away":
				userProfile.statusColor = "is-warning";
				break;
			case "offline":
			default:
				userProfile.statusColor = "is-dark";
				break;
		}
		if(userDocument.isProfilePublic) {
			let profileFields;
			if(userDocument.profile_fields) {
				profileFields = {};
				for(const key in userDocument.profile_fields) {
					profileFields[key] = md.makeHtml(userDocument.profile_fields[key]);
					profileFields[key] = profileFields[key].substring(3, profileFields[key].length-4);
				}
			}
			userProfile.profileFields = profileFields;
			userProfile.pastNames = userDocument.past_names;
			userProfile.afkMessage = userDocument.afk_message;
			mutualServers.forEach(svr => {
				userProfile.mutualServers.push({
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png",
					owner: svr.members.get(svr.ownerID).user.username
				});
			});
		}
		return userProfile;
	};
	app.get("/api/users", (req, res) => {
		const usr = bot.users.get(req.query.id);
		if(usr) {
			db.users.findOrCreate({_id: usr.id}, (err, userDocument) => {
				if(err || !userDocument) {
					userDocument = {};
				}
				res.json(getUserData(usr, userDocument));
			});
		} else {
			res.sendStatus(400);
		}
	});
	const getExtensionData = galleryDocument => {
		const owner = bot.users.get(galleryDocument.owner_id) || {};
		let typeIcon, typeDescription;
		switch(galleryDocument.type) {
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
				if(moment(galleryDocument.interval)) {
					let interval = moment.duration(galleryDocument.interval)
					typeDescription = `Interval: ${interval.hours()} hour(s) and ${interval.minutes()} minute(s)`;
				} else {
					typeDescription = `Interval: ${galleryDocument.interval}`
				}
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
				avatar: owner.avatarURL || "/static/img/discord-icon.png"
			},
			status: galleryDocument.state,
			points: galleryDocument.points,
			relativeLastUpdated: moment(galleryDocument.last_updated).fromNow(),
			rawLastUpdated: moment(galleryDocument.last_updated).format(config.moment_date_format)
		};
	};
	app.get("/api/extensions", (req, res) => {
		const params = {};
		if(req.query.id) {
			params._id = req.query.id;
		}
		if(req.query.name) {
			params.name = req.query.name;
		}
		if(req.query.type) {
			params.type = req.query.type;
		}
		if(req.query.status) {
			params.state = req.query.status;
		}
		if(req.query.owner) {
			params.owner_id = req.query.owner;
		}
		db.gallery.count(params, (err, rawCount) => {
			if(!err || rawCount==null) {
				rawCount = 0;
			}
			db.gallery.find(params).skip(req.query.start ? parseInt(req.query.start) : 0).limit(req.query.count ? parseInt(req.query.count) : rawCount).exec((err, galleryDocuments) => {
				if(!err && galleryDocuments) {
					const data = galleryDocuments.map(galleryDocument => {
						return getExtensionData(galleryDocument);
					});
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
		db.servers.aggregate({
			$group: {
				_id: null,
				total: {
					$sum: {
						$add: ["$messages_today"]
					}
				},
				active: {
					$sum: {
						$cond: [
							{$gt: ["$messages_today", 0]},
							1,
							0
						]
					}
				}
			}
		}, (err, result) => {
			let messageCount = 0;
			let activeServers = bot.guilds.size;
			if(!err && result) {
				messageCount = result[0].total;
				activeServers = result[0].active;
			}

			const renderPage = data => {
				res.render("pages/activity.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					rawServerCount: bot.guilds.size,
					rawUserCount: bot.users.size,
					totalMessageCount: messageCount,
					numActiveServers: activeServers,
					activeSearchQuery: req.query.q,
					mode: req.path.substring(req.path.lastIndexOf("/")+1),
					data
				});
			};

			if(req.path=="/activity/servers") {
				if(!req.query.q) {
					req.query.q = "";
				}
				let count;
				if(!req.query.count || isNaN(req.query.count)) {
					count = 16;
				} else {
					count = parseInt(req.query.count) || bot.guilds.size;
				}
				let page;
				if(!req.query.page || isNaN(req.query.page)) {
					page = 1;
				} else {
					page = parseInt(req.query.page);
				}
				if(!req.query.sort) {
					req.query.sort = "messages-des";
				}
				if(!req.query.category) {
					req.query.category = "All";
				}
				if(!req.query.publiconly) {
					req.query.publiconly = false;
				}

				const matchCriteria = {
					"config.public_data.isShown": true
				};
				if(req.query.q) {
					const query = req.query.q.toLowerCase();
					matchCriteria._id = {
						$in: bot.guilds.filter(svr => {
							return svr.name.toLowerCase().indexOf(query)>-1 || svr.id==query;
						}).map(svr => {
							return svr.id;
						})
					};
				} else {
					matchCriteria._id = {
						$in: Array.from(bot.guilds.keys())
					};
				}
				if(req.query.category!="All") {
					matchCriteria["config.public_data.server_listing.category"] = req.query.category;
				}
				if(req.query.publiconly=="true") {
					matchCriteria["config.public_data.server_listing.isEnabled"] = true;
				}

				let sortParams;
				switch(req.query.sort) {
					case "members-asc":
						sortParams = {
							"member_count": 1
						};
						break;
					case "members-des":
						sortParams = {
							"member_count": -1
						};
						break;
					case "messages-asc":
						sortParams = {
							"messages_today": 1
						};
						break;
					case "messages-des":
					default:
						sortParams = {
							"messages_today": -1
						};
						break;
				}

				db.servers.count(matchCriteria, (err, rawCount) => {
					if(err || rawCount==null) {
						rawCount = bot.guilds.size;
					}
					db.servers.aggregate([
						{
							$match: matchCriteria
						},
						{
							$project: {
								"messages_today": 1,
								"config.public_data": 1,
								"config.command_prefix": 1,
								"member_count": {
									$size: "$members"
								}
							}
						},
						{
							$sort: sortParams
						},
						{
							$skip: count * (page - 1)
						},
						{
							$limit: count
						}
					], (err, serverDocuments) => {
						let serverData = [];
						if(!err && serverDocuments) {
							serverData = serverDocuments.map(serverDocument => {
								return getServerData(serverDocument);
							});
						}

						let pageTitle = "Servers";
						if(req.query.q) {
							pageTitle = `Search for server "${req.query.q}"`;
						}
						renderPage({
							pageTitle,
							itemsPerPage: req.query.count==0 ? "0" : count.toString(),
							currentPage: page,
							numPages: Math.ceil(rawCount/(count==0 ? rawCount : count)),
							serverData,
							selectedCategory: req.query.category,
							isPublicOnly: req.query.publiconly,
							sortOrder: req.query.sort
						});
					});
				});
			} else if(req.path=="/activity/users") {
				if(!req.query.q) {
					req.query.q = "";
				}

				if(req.query.q) {
					const usr = findQueryUser(req.query.q, bot.users);
					if(usr) {
						db.users.findOrCreate({_id: usr.id}, (err, userDocument) => {
							if(err || !userDocument) {
								userDocument = {};
							}
							const userProfile = getUserData(usr, userDocument);
							renderPage({
								pageTitle: `${userProfile.username}'s Profile`,
								userProfile
							});
						});
					} else {
						renderPage({pageTitle: `Search for user "${req.query.q}"`});
					}
				} else {
					db.users.aggregate({
						$group: {
							_id: null,
							totalPoints: {
								$sum: {
									$add: "$points"
								}
							},
							publicProfilesCount: {
								$sum: {
									$cond: [
										{$ne: ["$isProfilePublic", false]},
										1,
										0
									]
								}
							},
							reminderCount: {
								$sum: {
									$size: "$reminders"
								}
							}
						}
					}, (err, result) => {
						let totalPoints = 0;
						let publicProfilesCount = 0;
						let reminderCount = 0;
						if(!err && result) {
							totalPoints = result[0].totalPoints;
							publicProfilesCount = result[0].publicProfilesCount;
							reminderCount = result[0].reminderCount;
						}

						renderPage({
							pageTitle: "Users",
							totalPoints,
							publicProfilesCount,
							reminderCount
						});
					});
				}
			}
		});
	});

	// Header image provider
	app.get("/header-image", (req, res) => {
		res.sendFile(`${__dirname}/public/img/${config.header_image}`);
	});

	// Server list provider for typeahead
	app.get("/serverlist", (req, res) => {
		const servers = bot.guilds.map(svr => {
			return svr.name;
		});
		servers.sort();
		res.json(servers);
	});

	// Check authentication for console
	const checkAuth = (req, res, next) => {
		if(req.isAuthenticated()) {
			const usr = bot.users.get(req.user.id);
			if(usr) {
				if(req.query.svrid=="maintainer") {
					if(config.maintainers.indexOf(req.user.id)>-1) {
						next(usr);
					} else {
						res.redirect("/dashboard");
					}
				} else {
					const svr = bot.guilds.get(req.query.svrid);
					if(svr && usr) {
						db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
							if(!err && serverDocument) {
								const member = svr.members.get(usr.id);
								if(bot.getUserBotAdmin(svr, serverDocument, member)>=3) {
									next(member, svr, serverDocument);
								} else {
									res.redirect("/dashboard");
								}
							} else {
								res.redirect("/error");
							}
						});
					} else {
						res.redirect("/error");
					}
				}
			} else {
				res.redirect("/error");
			}
		} else {
			res.redirect("/login");
		}
	};

	// User list provider for typeahead
	app.get("/userlist", (req, res) => {
		if(req.query.svrid) {
			checkAuth(req, res, (usr, svr) => {
				res.json(getUserList(svr.members.map(member => {
					return member.user;
				})));
			});
		} else {
			res.json(getUserList(bot.users));
		}
	});

	// Extension gallery
	app.get("/extensions", (req, res) => {
		res.redirect("/extensions/gallery");
	});
	app.post("/extensions", (req, res) => {
		if(req.isAuthenticated()) {
			if(req.query.extid && req.body.action) {
				if(["accept", "feature", "reject", "remove"].indexOf(req.body.action)>-1 && config.maintainers.indexOf(req.user.id)==-1) {
					res.sendStatus(403);
					return;
				}

				const getGalleryDocument = callback => {
					db.gallery.findOne({_id: req.query.extid}, (err, galleryDocument) => {
						if(!err && galleryDocument) {
							callback(galleryDocument);
						} else {
							res.sendStatus(500);
						}
					});
				};
				const getUserDocument = callback => {
					db.users.findOrCreate({_id: req.user.id}, (err, userDocument) => {
						if(!err && userDocument) {
							callback(userDocument);
						} else {
							res.sendStatus(500);
						}
					});
				};
				const messageOwner = (usrid, message) => {
					const usr = bot.users.get(usrid);
					if(usr) {
						usr.getDMChannel().then(ch => {
							ch.createMessage(message);
						}).catch();
					}
				};

				switch(req.body.action) {
					case "upvote":
						getGalleryDocument(galleryDocument => {
							getUserDocument(userDocument => {
								const vote = userDocument.upvoted_gallery_extensions.indexOf(galleryDocument._id)==-1 ? 1 : -1;
								if(vote==1) {
									userDocument.upvoted_gallery_extensions.push(galleryDocument._id);
								} else {
									userDocument.upvoted_gallery_extensions.splice(userDocument.upvoted_gallery_extensions.indexOf(galleryDocument._id), 1);
								}
								galleryDocument.points += vote;
								galleryDocument.save(() => {
									userDocument.save(() => {
										db.users.findOrCreate({_id: galleryDocument.owner_id}, (err, ownerUserDocument) => {
											if(!err && ownerUserDocument) {
												ownerUserDocument.points += vote * 10;
												ownerUserDocument.save(() => {});
											}
											res.sendStatus(200);
										});
									});
								});
							});
						});
						break;
					case "accept":
						getGalleryDocument(galleryDocument => {
							messageOwner(galleryDocument.owner_id, `Your extension ${galleryDocument.name} has been accepted to the AwesomeBot extension gallery! 🎉 ${config.hosting_url}extensions/gallery?id=${galleryDocument._id}`);
							galleryDocument.state = "gallery";
							galleryDocument.save(err => {
								res.sendStatus(err ? 500 : 200);
								db.servers.find({
									extensions: {
										$elemMatch: {
											_id: galleryDocument._id
										}
									}
								}, (err, serverDocuments) => {
									if(!err && serverDocuments) {
										serverDocuments.forEach(serverDocument => {
											serverDocument.extensions.id(galleryDocument._id).updates_available++;
											serverDocument.save(err => {
												if(err) {
													winston.error("Failed to save server data for extension update", {svrid: serverDocument._id}, err);
												}
											});
										});
									}
								});
							});
						});
						break;
					case "feature":
						getGalleryDocument(galleryDocument => {
							if(!galleryDocument.featured) {
								messageOwner(galleryDocument.owner_id, `Your extension ${galleryDocument.name} has been featured on the AwesomeBot extension gallery! 🌟 ${config.hosting_url}extensions/gallery?id=${galleryDocument._id}`);
							}
							galleryDocument.featured = galleryDocument.featured!=true;
							galleryDocument.save(err => {
								res.sendStatus(err ? 500 : 200);
							});
						});
						break;
					case "reject":
					case "remove":
						getGalleryDocument(galleryDocument => {
							messageOwner(galleryDocument.owner_id, `Your extension ${galleryDocument.name} has been ${req.body.action}${req.body.action=="reject" ? "e" : ""}d from the AwesomeBot extension gallery for the following reason:\`\`\`${req.body.reason}\`\`\``);
							db.users.findOrCreate({_id: galleryDocument.owner_id}, (err, ownerUserDocument) => {
								if(!err && ownerUserDocument) {
									ownerUserDocument.points -= galleryDocument.points * 10;
									ownerUserDocument.save(() => {});
								}
								galleryDocument.state = "saved";
								galleryDocument.save(err => {
									res.sendStatus(err ? 500 : 200);
								});
							});
						});
						break;
				}
			} else {
				res.sendStatus(400);
			}
		} else {
			res.sendStatus(403);
		}
	});
	app.get("/extension.abext", (req, res) => {
		if(req.query.extid) {
			try {
				res.set({
					"Content-Disposition": `${"attachment; filename='" + "gallery-"}${req.query.extid}.abext` + "'",
					"Content-Type": "text/javascript"
				});
				res.sendFile(path.resolve(`${__dirname}/../Extensions/gallery-${req.query.extid}.abext`));
			} catch(err) {
				res.sendStatus(500);
			}
		} else {
			res.sendStatus(400);
		}
	});
	app.get("/extensions/(|gallery|queue)", (req, res) => {
		let count;
		if(!req.query.count) {
			count = 18;
		} else {
			count = parseInt(req.query.count);
		}
		let page;
		if(!req.query.page) {
			page = 1;
		} else {
			page = parseInt(req.query.page);
		}

		const renderPage = (upvoted_gallery_extensions, serverData) => {
			const extensionState = req.path.substring(req.path.lastIndexOf("/")+1);
			db.gallery.count({
				state: extensionState
			}, (err, rawCount) => {
				if(err || rawCount==null) {
					rawCount = 0;
				}

				const matchCriteria = {
					"state": extensionState
				};
				if(req.query.id) {
					matchCriteria._id = req.query.id;
				} else if(req.query.q) {
					matchCriteria.$text = {
						$search: req.query.q
					};
				}

				db.gallery.find(matchCriteria).sort("-featured -points -last_updated").skip(count * (page - 1)).limit(count).exec((err, galleryDocuments) => {
					const pageTitle = `${extensionState.charAt(0).toUpperCase() + extensionState.slice(1)} - AwesomeBot Extensions`;
					const extensionData = galleryDocuments.map(getExtensionData);

					res.render("pages/extensions.ejs", {
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						isMaintainer: req.isAuthenticated() ? config.maintainers.indexOf(req.user.id)>-1 : false,
						pageTitle,
						serverData,
						activeSearchQuery: req.query.id || req.query.q,
						mode: extensionState,
						rawCount,
						itemsPerPage: req.query.count,
						currentPage: page,
						numPages: Math.ceil(rawCount/(count==0 ? rawCount : count)),
						extensions: extensionData,
						upvotedData: upvoted_gallery_extensions
					});
				});
			});
		};

		if(req.isAuthenticated()) {
			const serverData = [];
			const usr = bot.users.get(req.user.id);
			const addServerData = (i, callback) => {
				if(req.user.guilds && i<req.user.guilds.length) {
					const svr = bot.guilds.get(req.user.guilds[i].id);
					if(svr && usr) {
						db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
							if(!err && serverDocument) {
								const member = svr.members.get(usr.id);
								if(bot.getUserBotAdmin(svr, serverDocument, member)>=3) {
									serverData.push({
										name: req.user.guilds[i].name,
										id: req.user.guilds[i].id,
										icon: req.user.guilds[i].icon ? (`https://cdn.discordapp.com/icons/${req.user.guilds[i].id}/${req.user.guilds[i].icon}.jpg`) : "/static/img/discord-icon.png"
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
				serverData.sort((a, b) => {
					return a.name.localeCompare(b.name);
				});
				db.users.findOne({_id: req.user.id}, (err, userDocument) => {
					if(!err && userDocument) {
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
		if(req.isAuthenticated()) {
			db.gallery.find({
				owner_id: req.user.id
			}, (err, galleryDocuments) => {
				res.render("pages/extensions.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					currentPage: req.path,
					pageTitle: "My AwesomeBot Extensions",
					serverData: {
						id: req.user.id
					},
					activeSearchQuery: req.query.q,
					mode: "my",
					rawCount: (galleryDocuments || []).length,
					extensions: galleryDocuments || []
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
		if(req.isAuthenticated()) {
			db.gallery.find({
				owner_id: req.user.id
			}, (err, galleryDocuments) => {
				if(!err && galleryDocuments) {
					for(let i=0; i<galleryDocuments.length; i++) {
						if(req.body[`extension-${i}-removed`]!=null) {
							db.gallery.findByIdAndRemove(galleryDocuments[i]._id).exec();
							try {
								fs.unlinkSync(`${__dirname}/../Extensions/gallery-${galleryDocuments[i]._id}.abext`);
								break;
							} catch(err) {
								break;
							}
						}
					}
					io.of(req.path).emit("update", req.user.id);
					res.redirect(req.originalUrl);
				} else {
					res.redirect("/error");
				}
			});
		} else {
			res.redirect("/login");
		}
	});

	// Extension builder
	app.get("/extensions/builder", (req, res) => {
		if(req.isAuthenticated()) {
			const renderPage = extensionData => {
				res.render("pages/extensions.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					currentPage: req.path,
					pageTitle: `${extensionData.name ? (`${extensionData.name} - `) : ""}AwesomeBot Extension Builder`,
					serverData: {
						id: req.user.id
					},
					activeSearchQuery: req.query.q,
					mode: "builder",
					extensionData
				});
			};

			if(req.query.extid) {
				db.gallery.findOne({
					_id: req.query.extid,
					owner_id: req.user.id
				}, (err, galleryDocument) => {
					if(!err && galleryDocument) {
						try {
							galleryDocument.code = fs.readFileSync(`${__dirname}/../Extensions/gallery-${galleryDocument._id}.abext`);
						} catch(err) {
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
	const validateExtensionData = data => {
		return ((data.type=="command" && data.key) || (data.type=="keyword" && data.keywords) || (data.type=="timer" && data.interval)) && data.code;
	};
	const writeExtensionData = (extensionDocument, data) => {
		extensionDocument.name = data.name;
		extensionDocument.type = data.type;
		extensionDocument.key = data.type=="command" ? data.key : null;
		extensionDocument.keywords = data.type=="keyword" ? data.keywords.split(",") : null;
		extensionDocument.case_sensitive = data.type=="keyword" ? data.case_sensitive=="on" : null;
		extensionDocument.interval = data.type=="timer" ? data.interval : null;
		extensionDocument.usage_help = data.type=="command" ? data.usage_help : null;
		extensionDocument.extended_help = data.type=="command" ? data.extended_help : null;
		extensionDocument.last_updated = Date.now();

		return extensionDocument;
	};
	app.post("/extensions/builder", (req, res) => {
		if(req.isAuthenticated()) {
			if(validateExtensionData(req.body)) {
				const sendResponse = () => {
					io.of(req.path).emit("update", req.user.id);
					if(req.query.external=="true") {
						res.sendStatus(200);
					} else {
						res.redirect(req.originalUrl);
					}
				};
				const saveExtensionCode = (err, extid) => {
					if(err) {
						winston.error(`Failed to update settings at ${req.path}`, {usrid: req.user.id}, err);
						sendResponse();
					} else {
						writeFile(`${__dirname}/../Extensions/gallery-${extid}.abext`, req.body.code, () => {
							sendResponse();
						});
					}
				};
				const saveExtensionData = (galleryDocument, isUpdate) => {
					galleryDocument.level = "gallery";
					galleryDocument.state = "queue";
					galleryDocument.description = req.body.description;
					writeExtensionData(galleryDocument, req.body);

					if(!isUpdate) {
						galleryDocument.owner_id = req.user.id;
						io.of("/extensions/my").emit("update", req.user.id);
					}
					galleryDocument.save(err => {
						if(!err && !req.query.extid) {
							req.originalUrl += `extid=${galleryDocument._id}`;
						}
						saveExtensionCode(err, galleryDocument._id);
					});
				};

				if(req.query.extid) {
					db.gallery.findOne({
						_id: req.query.extid,
						owner_id: req.user.id
					}, (err, galleryDocument) => {
						if(!err && galleryDocument) {
							saveExtensionData(galleryDocument, true);
						} else {
							saveExtensionData(new db.gallery(), false);
						}
					});
				} else {
					saveExtensionData(new db.gallery(), false);
				}
			} else {
				res.redirect("/error");
			}
		} else {
			res.redirect("/login");
		}
	});

	// Blog (updates + announcements)
	const getBlogData = blogDocument => {
		const author = bot.users.get(blogDocument.author_id) || {
			id: "invalid-user",
			username: "invalid-user"
		};
		let categoryColor;
		switch(blogDocument.category) {
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
		return {
			id: blogDocument._id,
			title: blogDocument.title,
			author: {
				name: author.username,
				id: author.id,
				avatar: author.avatarURL || "/static/img/discord-icon.png"
			},
			category: blogDocument.category,
			categoryColor,
			rawPublished: moment(blogDocument.published_timestamp).format(config.moment_date_format),
			roundedPublished: moment(blogDocument.published_timestamp).fromNow(),
			content: md.makeHtml(blogDocument.content)
		};
	};
	app.get("/blog", (req, res) => {
		let count;
		if(!req.query.count || isNaN(req.query.count)) {
			count = 4;
		} else {
			count = parseInt(req.query.count);
		}
		let page;
		if(!req.query.page || isNaN(req.query.page)) {
			page = 1;
		} else {
			page = parseInt(req.query.page);
		}

		db.blog.count({}, (err, rawCount) => {
			if(err || rawCount==null) {
				rawCount = 0;
			}

			db.blog.find({}).sort("-published_timestamp").skip(count * (page - 1)).limit(count).exec((err, blogDocuments) => {
				let blogPosts = [];
				if(!err && blogDocuments) {
					blogPosts = blogDocuments.map(blogDocument => {
						const data = getBlogData(blogDocument);
						data.isPreview = true;
						if(data.content.length>1000) {
							data.content = `${data.content.slice(0, 1000)}...`;
						}
						return data;
					});
				}

				res.render("pages/blog.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					isMaintainer: req.isAuthenticated() ? config.maintainers.indexOf(req.user.id)>-1 : false,
					mode: "list",
					currentPage: page,
					numPages: Math.ceil(rawCount/(count==0 ? rawCount : count)),
					pageTitle: "AwesomeBot Blog",
					data: blogPosts
				});
			});
		});
	});
	app.get("/blog/compose", (req, res) => {
		if(req.isAuthenticated()) {
			if(config.maintainers.indexOf(req.user.id)>-1) {
				const renderPage = data => {
					res.render("pages/blog.ejs", {
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						isMaintainer: true,
						pageTitle: `${data.title ? (`Edit ${data.title}`) : "New Post"} - AwesomeBot Blog`,
						mode: "compose",
						data
					});
				};

				if(req.query.id) {
					db.blog.findOne({_id: req.query.id}, (err, blogDocument) => {
						if(err || !blogDocument) {
							renderPage({});
						} else {
							renderPage({
								id: blogDocument._id,
								title: blogDocument.title,
								category: blogDocument.category,
								content: blogDocument.content
							});
						}
					});
				} else {
					renderPage({});
				}
			} else {
				res.redirect("/error");
			}
		} else {
			res.redirect("/login");
		}
	});
	app.post("/blog/compose", (req, res) => {
		if(req.isAuthenticated()) {
			if(config.maintainers.indexOf(req.user.id)>-1) {
				if(req.query.id) {
					db.blog.findOne({_id: req.query.id}, (err, blogDocument) => {
						if(err || !blogDocument) {
							res.redirect("/error");
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
						content: req.body.content
					});
					blogDocument.save(() => {
						res.redirect(`/blog/${blogDocument._id}`);
					});
				}
			} else {
				res.redirect("/error");
			}
		} else {
			res.redirect("/login");
		}
	});
	app.get("/blog/:id", (req, res) => {
		db.blog.findOne({
			_id: req.params.id
		}, (err, blogDocument) => {
			if(err || !blogDocument) {
				res.redirect("/error");
			} else {
				const data = getBlogData(blogDocument);
				const getReactionCount = value => {
					return blogDocument.reactions.reduce((count, reactionDocument) => {
						return count + (reactionDocument.value==value);
					}, 0);
				};
				data.reactions = {};
				[-1, 0, 1].forEach(reaction => {
					data.reactions[reaction] = getReactionCount(reaction);
				});
				if(req.isAuthenticated()) {
					data.userReaction = blogDocument.reactions.id(req.user.id) || {};
				}
				res.render("pages/blog.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					isMaintainer: req.isAuthenticated() ? config.maintainers.indexOf(req.user.id)>-1 : false,
					mode: "article",
					pageTitle: `${blogDocument.title} - AwesomeBot Blog`,
					blogPost: data
				});
			}
		});
	});
	app.post("/blog/:id/react", (req, res) => {
		if(req.isAuthenticated()) {
			db.blog.findOne({_id: req.params.id}, (err, blogDocument) => {
				if(err || !blogDocument) {
					res.sendStatus(500);
				} else {
					req.query.value = parseInt(req.query.value);

					const userReactionDocument = blogDocument.reactions.id(req.user.id);
					if(userReactionDocument) {
						if(userReactionDocument.value==req.query.value) {
							userReactionDocument.remove();
						} else {
							userReactionDocument.value = req.query.value;
						}
					} else {
						blogDocument.reactions.push({
							_id: req.user.id,
							value: req.query.value
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
		if(req.isAuthenticated()) {
			if(config.maintainers.indexOf(req.user.id)>-1) {
				db.blog.findByIdAndRemove(req.params.id, err => {
					res.sendStatus(err ? 500 : 200);
				});
			} else {
				res.redirect("/error");
			}
		} else {
			res.redirect("/login");
		}
	});

	// Wiki page (documentation)
	app.get("/wiki", (req, res) => {
		db.wiki.find({}).sort({
			_id: 1
		}).exec((err, wikiDocuments) => {
			if(err || !wikiDocuments) {
				res.redirect("/error");
			} else {
				if(req.query.q!=null) {
					req.query.q = req.query.q.toLowerCase().trim();

					const searchResults = [];
					wikiDocuments.forEach(wikiDocument => {
						const titleMatch = wikiDocument._id.toLowerCase().indexOf(req.query.q);
						const content = removeMd(wikiDocument.content);
						const contentMatch = content.toLowerCase().indexOf(req.query.q);

						if(titleMatch>-1 || contentMatch>-1) {
							let matchText;
							if(contentMatch) {
								const startIndex = contentMatch<300 ? 0 : (contentMatch - 300);
								const endIndex = contentMatch>content.length-300 ? content.length : (contentMatch + 300);
								matchText = `${content.substring(startIndex, contentMatch)}<strong>${content.substring(contentMatch, contentMatch+req.query.q.length)}</strong>${content.substring(contentMatch+req.query.q.length, endIndex)}`;
								if(startIndex>0) {
									matchText = `...${matchText}`;
								}
								if(endIndex<content.length) {
									matchText += "...";
								}
							} else {
								matchText = content.slice(0, 300);
								if(content.length>300) {
									matchText += "...";
								}
							}
							searchResults.push({
								title: wikiDocument._id,
								matchText
							});
						}
					});

					res.render("pages/wiki.ejs", {
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						isContributor: req.isAuthenticated() ? (config.wiki_contributors.indexOf(req.user.id)>-1 || config.maintainers.indexOf(req.user.id)>-1) : false,
						pageTitle: `Search for "${req.query.q}" - AwesomeBot Wiki`,
						pageList: wikiDocuments.map(wikiDocument => {
							return wikiDocument._id;
						}),
						mode: "search",
						data: {
							title: req.query.q ? `Search for "${req.query.q}"` : "List of all pages",
							activeSearchQuery: req.query.q,
							searchResults
						}
					});
				} else {
					res.redirect("/wiki/Home");
				}
			}
		});
	});
	app.get("/wiki/edit", (req, res) => {
		if(req.isAuthenticated()) {
			if(config.wiki_contributors.indexOf(req.user.id)>-1 || config.maintainers.indexOf(req.user.id)>-1) {
				const renderPage = data => {
					res.render("pages/wiki.ejs", {
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						pageTitle: `${data.title ? (`Edit ${data.title}`) : "New Page"} - AwesomeBot Wiki`,
						mode: "edit",
						data
					});
				};

				if(req.query.id) {
					db.wiki.findOne({_id: req.query.id}, (err, wikiDocument) => {
						if(err || !wikiDocument) {
							renderPage({
								title: req.query.id
							});
						} else {
							renderPage({
								title: wikiDocument._id,
								content: wikiDocument.content
							});
						}
					});
				} else {
					renderPage({});
				}
			} else {
				res.redirect("/error");
			}
		} else {
			res.redirect("/login");
		}
	});
	app.post("/wiki/edit", (req, res) => {
		if(req.isAuthenticated()) {
			if(config.wiki_contributors.indexOf(req.user.id)>-1 || config.maintainers.indexOf(req.user.id)>-1) {
				if(req.query.id) {
					db.wiki.findOne({_id: req.query.id}, (err, wikiDocument) => {
						if(err || !wikiDocument) {
							res.redirect("/error");
						} else {
							wikiDocument._id = req.body.title;
							wikiDocument.updates.push({
								_id: req.user.id,
								diff: diff.prettyHtml(diff.main(wikiDocument.content, req.body.content).filter(a => {
									return a[0]!=0;
								}))
							});
							wikiDocument.content = req.body.content;

							wikiDocument.save(() => {
								res.redirect(`/wiki/${wikiDocument._id}`);
							});
						}
					});
				} else {
					const wikiDocument = new db.wiki({
						_id: req.body.title,
						content: req.body.content,
						updates: [{
							_id: req.user.id
						}]
					});
					wikiDocument.save(() => {
						res.redirect(`/wiki/${wikiDocument._id}`);
					});
				}
			} else {
				res.redirect("/error");
			}
		} else {
			res.redirect("/login");
		}
	});
	app.get("/wiki/:id", (req, res) => {
		db.wiki.find({}).sort({
			_id: 1
		}).exec((err, wikiDocuments) => {
			if(err || !wikiDocuments) {
				res.redirect("/error");
			} else {
				const page = wikiDocuments.find(wikiDocument => {
					return wikiDocument._id==req.params.id;
				}) || {
					_id: req.params.id
				};
				const getReactionCount = value => {
					return page.reactions.reduce((count, reactionDocument) => {
						return count + (reactionDocument.value==value);
					}, 0);
				};
				let reactions, userReaction;
				if(page.updates && page.reactions) {
					reactions = {
						"-1": getReactionCount(-1),
						"1": getReactionCount(1)
					};
					if(req.isAuthenticated()) {
						userReaction = page.reactions.id(req.user.id) || {};
					}
				}
				res.render("pages/wiki.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					isContributor: req.isAuthenticated() ? (config.wiki_contributors.indexOf(req.user.id)>-1 || config.maintainers.indexOf(req.user.id)>-1) : false,
					pageTitle: `${page._id} - AwesomeBot Wiki`,
					pageList: wikiDocuments.map(wikiDocument => {
						return wikiDocument._id;
					}),
					mode: "page",
					data: {
						title: page._id,
						content: md.makeHtml(page.content),
						reactions,
						userReaction
					}
				});
			}
		});
	});
	app.get("/wiki/:id/history", (req, res) => {
		db.wiki.find({}).sort({
			_id: 1
		}).exec((err, wikiDocuments) => {
			if(err || !wikiDocuments) {
				res.redirect("/error");
			} else {
				const page = wikiDocuments.find(wikiDocument => {
					return wikiDocument._id==req.params.id;
				}) || {
					_id: req.params.id
				};
				let updates;
				if(page.updates && page.reactions) {
					updates = page.updates.map(updateDocument => {
						const author = bot.users.get(updateDocument._id) || {
							id: "invalid-user",
							username: "invalid-user"
						};
						return {
							responsibleUser: {
								name: author.username,
								id: author.id,
								avatar: author.avatarURL || "/static/img/discord-icon.png"
							},
							relativeTimestamp: moment(updateDocument.timestamp).fromNow(),
							rawTimestamp: moment(updateDocument.timestamp).format(config.moment_date_format),
							diffHtml: updateDocument.diff
						};
					});
				}
				res.render("pages/wiki.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					isContributor: req.isAuthenticated() ? (config.wiki_contributors.indexOf(req.user.id)>-1 || config.maintainers.indexOf(req.user.id)>-1) : false,
					pageTitle: `Edit history for ${page._id} - AwesomeBot Wiki`,
					pageList: wikiDocuments.map(wikiDocument => {
						return wikiDocument._id;
					}),
					mode: "history",
					data: {
						title: `Edit history for ${page._id}`,
						updates
					}
				});
			}
		});
	});
	app.post("/wiki/:id/react", (req, res) => {
		if(req.isAuthenticated()) {
			db.wiki.findOne({_id: req.params.id}, (err, wikiDocument) => {
				if(err || !wikiDocument) {
					res.sendStatus(500);
				} else {
					req.query.value = parseInt(req.query.value);

					const userReactionDocument = wikiDocument.reactions.id(req.user.id);
					if(userReactionDocument) {
						if(userReactionDocument.value==req.query.value) {
							userReactionDocument.remove();
						} else {
							userReactionDocument.value = req.query.value;
						}
					} else {
						wikiDocument.reactions.push({
							_id: req.user.id,
							value: req.query.value
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
		if(req.isAuthenticated()) {
			if(config.maintainers.indexOf(req.user.id)>-1) {
				db.wiki.findByIdAndRemove(req.params.id, err => {
					res.sendStatus(err ? 500 : 200);
				});
			} else {
				res.redirect("/error");
			}
		} else {
			res.redirect("/login");
		}
	});

	// Donation options
	app.get("/donate", (req, res) => {
		res.render("pages/donate.ejs", {
			authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
			charities: config.donate_charities
		});
	});

	// Save serverDocument after admin console form data is received
	const saveAdminConsoleOptions = (consolemember, svr, serverDocument, req, res, override) => {
		serverDocument.save(err => {
			io.of(req.path).emit("update", svr.id);
			if(err) {
				winston.error(`Failed to update settings at ${req.path}`, {svrid: svr.id, usrid: consolemember.id}, err);
			}
			if(override) {
				res.sendStatus(200);
			} else {
				res.redirect(req.originalUrl);
			}
		});
	};

	// Save config.json after maintainer console form data is received
	const saveMaintainerConsoleOptions = (consolemember, req, res) => {
		io.of(req.path).emit("update", "maintainer");
		writeFile(`${__dirname}/../Configuration/config.json`, JSON.stringify(config, null, 4), err => {
			if(err) {
				winston.error(`Failed to update settings at ${req.path}`, {usrid: consolemember.id}, err);
			}
			res.redirect(req.originalUrl);
		});
	};

	// Login to admin console
	app.get("/login", passport.authenticate("discord", {
		scope: discordOAuthScopes
	}));

	// Callback for Discord OAuth2
	app.get("/login/callback", passport.authenticate("discord", {
		failureRedirect: "/error"
	}), (req, res) => {
		if(config.global_blocklist.indexOf(req.user.id)>-1 || !req.user.verified) {
			res.redirect("/error");
		} else {
			res.redirect("/dashboard");
		}
	});

	// Admin console dashboard
	app.get("/dashboard", (req, res) => {
		if(!req.isAuthenticated()) {
			res.redirect("/login");
		} else {
			const serverData = [];
			const usr = bot.users.get(req.user.id);
			const addServerData = (i, callback) => {
				if(req.user.guilds && i<req.user.guilds.length) {
					const svr = bot.guilds.get(req.user.guilds[i].id);
					if(!svr && !((parseInt(req.user.guilds[i].permissions) >> 5) & 1)) {
						addServerData(++i, callback);
						return;
					}
					const data = {
						name: req.user.guilds[i].name,
						id: req.user.guilds[i].id,
						icon: req.user.guilds[i].icon ? (`https://cdn.discordapp.com/icons/${req.user.guilds[i].id}/${req.user.guilds[i].icon}.jpg`) : "/static/img/discord-icon.png",
						botJoined: svr!=null,
						isAdmin: false
					};
					if(svr && usr) {
						db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
							if(!err && serverDocument) {
								const member = svr.members.get(usr.id);
								if(bot.getUserBotAdmin(svr, serverDocument, member)>=3) {
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
				serverData.sort((a, b) => {
					return a.name.localeCompare(b.name);
				});
				if(config.maintainers.indexOf(req.user.id)>-1) {
					serverData.push({
						name: "Maintainer Console",
						id: "maintainer",
						icon: "/static/img/transparent.png",
						botJoined: true,
						isAdmin: true
					});
				}
				res.render("pages/dashboard.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					serverData,
					rawJoinLink: `https://discordapp.com/oauth2/authorize?&client_id=${auth.platform.client_id}&scope=bot&permissions=470019135`
				});
			});
		}
	});

	// Admin console overview (home)
	app.get("/dashboard/overview", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			// Redirect to maintainer console if necessary
			if(!svr) {
				res.redirect("/dashboard/maintainer?svrid=maintainer");
			} else {
				let topCommand;
				let topCommandUsage = 0;
				for(const cmd in serverDocument.command_usage) {
					if(serverDocument.command_usage[cmd]>topCommandUsage) {
						topCommand = cmd;
						topCommandUsage = serverDocument.command_usage[cmd];
					}
				}
				const topMemberID = serverDocument.members.sort((a, b) => {
					return b.messages - a.messages;
				})[0];
				const topMember = svr.members.get(topMemberID ? topMemberID._id : null);
				const memberIDs = svr.members.map(a => {
					return a.id;
				});
				db.users.find({
					_id: {
						"$in": memberIDs
					}
				}).sort({
					points: -1
				}).limit(1).exec((err, userDocuments) => {
					let richestMember;
					if(!err && userDocuments && userDocuments.length>0) {
						richestMember = svr.members.get(userDocuments[0]._id);
					}
					const topGame = serverDocument.games.sort((a, b) => {
						return b.time_played - a.time_played;
					})[0];
					res.render("pages/admin-overview.ejs", {
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						serverData: {
							name: svr.name,
							id: svr.id,
							icon: svr.iconURL || "/static/img/discord-icon.png",
							owner: {
								username: svr.members.get(svr.ownerID).user.username,
								id: svr.members.get(svr.ownerID).id,
								avatar: svr.members.get(svr.ownerID).user.avatarURL || "/static/img/discord-icon.png"
							}
						},
						currentPage: req.path,
						messagesToday: serverDocument.messages_today,
						topCommand,
						memberCount: svr.members.size,
						topMember: topMember ? {
							username: topMember.user.username,
							id: topMember.id,
							avatar: topMember.user.avatarURL || "/static/img/discord-icon.png"
						} : null,
						topGame: topGame ? topGame._id : null,
						richestMember: richestMember ? {
							username: richestMember.user.username,
							id: richestMember.id,
							avatar: richestMember.user.avatarURL || "/static/img/discord-icon.png"
						} : null
					});
				});
			}
		});
	});

	// Admin console command options
	app.get("/dashboard/commands/command-options", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-command-options.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				currentPage: req.path,
				configData: {
					chatterbot: serverDocument.config.chatterbot,
					command_cooldown: serverDocument.config.command_cooldown,
					command_fetch_properties: serverDocument.config.command_fetch_properties,
					command_prefix: bot.getCommandPrefix(svr, serverDocument),
					delete_command_messages: serverDocument.config.delete_command_messages
				},
				botName: svr.members.get(bot.user.id).nick || bot.user.username
			});
		});
	});
	io.of("/dashboard/commands/command-options").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/commands/command-options", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body.command_prefix!=bot.getCommandPrefix(svr, serverDocument)) {
				serverDocument.config.command_prefix = req.body.command_prefix;
			}
			serverDocument.config.delete_command_messages = req.body.delete_command_messages=="on";
			serverDocument.config.chatterbot = req.body.chatterbot=="on";
			serverDocument.config.command_cooldown = parseInt(req.body.command_cooldown);
			serverDocument.config.command_fetch_properties.default_count = parseInt(req.body.default_count);
			serverDocument.config.command_fetch_properties.max_count = parseInt(req.body.max_count);

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console command list
	app.get("/dashboard/commands/command-list", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			const commandDescriptions = {};
			const commandCategories = {};
			bot.getPublicCommandList().forEach(command => {
				const commandData = bot.getPublicCommandMetadata(command);
				commandDescriptions[command] = commandData.description;
				commandCategories[command] = commandData.category;
			});
			res.render("pages/admin-command-list.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
				configData: {
					commands: serverDocument.toObject().config.commands
				},
				commandDescriptions,
				commandCategories
			});
		});
	});
	io.of("/dashboard/commands/command-list").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	const parseCommandOptions = (svr, serverDocument, command, data) => {
		const commandData = bot.getPublicCommandMetadata(command);
		if(commandData) {
			if(!serverDocument.config.commands[command]) {
				serverDocument.config.commands[command] = {};
			}
			if(commandData.defaults.admin_level<4) {
				serverDocument.config.commands[command].isEnabled = data[`${command}-isEnabled`]=="on";
				serverDocument.config.commands[command].admin_level = data[`${command}-admin_level`] || 0;
				serverDocument.config.commands[command].disabled_channel_ids = [];
				svr.channels.forEach(ch => {
					if(ch.type==0) {
						if(data[`${command}-disabled_channel_ids-${ch.id}`]==null) {
							serverDocument.config.commands[command].disabled_channel_ids.push(ch.id);
						}
					}
				});
			}
		}
	};
	app.post("/dashboard/commands/command-list", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["preset-applied"]!=null) {
				const disabled_channel_ids = [];
				svr.channels.forEach(ch => {
					if(ch.type==0) {
						if(req.body[`preset-disabled_channel_ids-${ch.id}`]==null) {
							disabled_channel_ids.push(ch.id);
						}
					}
				});
				for(const command in serverDocument.toObject().config.commands) {
					serverDocument.config.commands[command].admin_level = req.body["preset-admin_level"] || 0;
					serverDocument.config.commands[command].disabled_channel_ids = disabled_channel_ids;
				}
			} else {
				for(const command in serverDocument.toObject().config.commands) {
					parseCommandOptions(svr, serverDocument, command, req.body);
				}
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console RSS feeds
	app.get("/dashboard/commands/rss-feeds", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-rss-feeds.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
				configData: {
					rss_feeds: serverDocument.config.rss_feeds,
					commands: {
						rss: serverDocument.config.commands.rss,
						trivia: {
							isEnabled: serverDocument.config.commands.trivia.isEnabled
						}
					}
				},
				commandDescriptions: {
					rss: bot.getPublicCommandMetadata("rss").description
				},
				commandCategories: {
					rss: bot.getPublicCommandMetadata("rss").category
				}
			});
		});
	});
	io.of("/dashboard/commands/rss-feeds").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/commands/rss-feeds", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["new-url"] && req.body["new-name"] && !serverDocument.config.rss_feeds.id(req.body["new-name"])) {
				serverDocument.config.rss_feeds.push({
					_id: req.body["new-name"],
					url: req.body["new-url"]
				});
			} else {
				parseCommandOptions(svr, serverDocument, "rss", req.body);
				for(let i=0; i<serverDocument.config.rss_feeds.length; i++) {
					if(req.body[`rss-${i}-removed`]!=null) {
						serverDocument.config.rss_feeds[i] = null;
					} else {
						serverDocument.config.rss_feeds[i].streaming.isEnabled = req.body[`rss-${i}-streaming-isEnabled`]=="on";
						serverDocument.config.rss_feeds[i].streaming.enabled_channel_ids = [];
						svr.channels.forEach(ch => {
							if(ch.type==0) {
								if(req.body[`rss-${i}-streaming-enabled_channel_ids-${ch.id}`]=="on") {
									serverDocument.config.rss_feeds[i].streaming.enabled_channel_ids.push(ch.id);
								}
							}
						});
					}
				}
				serverDocument.config.rss_feeds.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console streamers
	app.get("/dashboard/commands/streamers", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-streamers.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
				configData: {
					streamers_data: serverDocument.config.streamers_data,
					commands: {
						streamers: serverDocument.config.commands.streamers,
						trivia: {
							isEnabled: serverDocument.config.commands.trivia.isEnabled
						}
					}
				},
				commandDescriptions: {
					streamers: bot.getPublicCommandMetadata("streamers").description
				},
				commandCategories: {
					streamers: bot.getPublicCommandMetadata("streamers").category
				}
			});
		});
	});
	io.of("/dashboard/commands/streamers").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/commands/streamers", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["new-name"] && req.body["new-type"] && !serverDocument.config.streamers_data.id(req.body["new-name"])) {
				serverDocument.config.streamers_data.push({
					_id: req.body["new-name"],
					type: req.body["new-type"]
				});
			} else {
				parseCommandOptions(svr, serverDocument, "streamers", req.body);
				for(let i=0; i<serverDocument.config.streamers_data.length; i++) {
					if(req.body[`streamer-${i}-removed`]!=null) {
						serverDocument.config.streamers_data[i] = null;
					} else {
						serverDocument.config.streamers_data[i].channel_id = req.body[`streamer-${i}-channel_id`];
					}
				}
				serverDocument.config.streamers_data.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console tags
	app.get("/dashboard/commands/tags", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			const data = {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
				configData: {
					tags: serverDocument.config.tags,
					commands: {
						tag: serverDocument.config.commands.tag,
						trivia: {
							isEnabled: serverDocument.config.commands.trivia.isEnabled
						}
					}
				},
				commandDescriptions: {
					tag: bot.getPublicCommandMetadata("tag").description
				},
				commandCategories: {
					tag: bot.getPublicCommandMetadata("tag").category
				}
			};

			const cleanTag = content => {
				let cleanContent = "";
				while(content.indexOf("<")>-1) {
					cleanContent += content.substring(0, content.indexOf("<"));
					content = content.substring(content.indexOf("<")+1);
					if(content && content.indexOf(">")>1) {
						const type = content.charAt(0);
						const id = content.substring(1, content.indexOf(">"));
						if(!isNaN(id)) {
							if(type=="@") {
								const usr = svr.members.get(id);
								if(usr) {
									cleanContent += `<b>@${usr.username}</b>`;
									content = content.substring(content.indexOf(">")+1);
									continue;
								}
							} else if(type=="#") {
								const ch = svr.channels.get(id);
								if(ch) {
									cleanContent += `<b>#${ch.name}</b>`;
									content = content.substring(content.indexOf(">")+1);
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

			for(let i=0; i<data.configData.tags.list.length; i++) {
				data.configData.tags.list[i].content = cleanTag(data.configData.tags.list[i].content);
				data.configData.tags.list[i].index = i;
			}
			data.configData.tags.list.sort((a, b) => {
				return a._id.localeCompare(b._id);
			});
			res.render("pages/admin-tags.ejs", data);
		});
	});
	io.of("/dashboard/commands/tags").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/commands/tags", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["new-name"] && req.body["new-type"] && req.body["new-content"] && !serverDocument.config.tags.list.id(req.body["new-name"])) {
				serverDocument.config.tags.list.push({
					_id: req.body["new-name"],
					content: req.body["new-content"],
					isCommand: req.body["new-type"]=="command"
				});
			} else {
				parseCommandOptions(svr, serverDocument, "tag", req.body);
				serverDocument.config.tags.listIsAdminOnly = req.body.listIsAdminOnly=="true";
				serverDocument.config.tags.addingIsAdminOnly = req.body.addingIsAdminOnly=="true";
				serverDocument.config.tags.addingCommandIsAdminOnly = req.body.addingCommandIsAdminOnly=="true";
				serverDocument.config.tags.removingIsAdminOnly = req.body.removingIsAdminOnly=="true";
				serverDocument.config.tags.removingCommandIsAdminOnly = req.body.removingCommandIsAdminOnly=="true";
				for(let i=0; i<serverDocument.config.tags.list.length; i++) {
					if(req.body[`tag-${i}-removed`]!=null) {
						serverDocument.config.tags.list[i] = null;
					} else {
						serverDocument.config.tags.list[i].isCommand = req.body[`tag-${i}-isCommand`]=="command";
						serverDocument.config.tags.list[i].isLocked = req.body[`tag-${i}-isLocked`]=="on";
					}
				}
				serverDocument.config.tags.list.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console auto translation
	app.get("/dashboard/commands/auto-translation", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			const data = {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
				configData: {
					translated_messages: serverDocument.config.translated_messages,
					commands: {
						trivia: {
							isEnabled: serverDocument.config.commands.trivia.isEnabled
						}
					}
				}
			};
			for(let i=0; i<data.configData.translated_messages.length; i++) {
				const member = svr.members.get(data.configData.translated_messages[i]._id) || {};
				data.configData.translated_messages[i].username = member.user.username;
				data.configData.translated_messages[i].avatar = member.user.avatarURL || "/static/img/discord-icon.png";
			}
			res.render("pages/admin-auto-translation.ejs", data);
		});
	});
	io.of("/dashboard/commands/auto-translation").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/commands/auto-translation", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["new-member"] && req.body["new-source_language"]) {
				const member = findQueryUser(req.body["new-member"], svr.members);
				if(member && !serverDocument.config.translated_messages.id(member.id)) {
					const enabled_channel_ids = [];
					svr.channels.forEach(ch => {
						if(ch.type==0) {
							if(req.body[`new-enabled_channel_ids-${ch.id}`]=="true") {
								enabled_channel_ids.push(ch.id);
							}
						}
					});
					serverDocument.config.translated_messages.push({
						_id: member.id,
						source_language: req.body["new-source_language"],
						enabled_channel_ids
					});
				}
			} else {
				for(let i=0; i<serverDocument.config.translated_messages.length; i++) {
					if(req.body[`translated_messages-${i}-removed`]!=null) {
						serverDocument.config.translated_messages[i] = null;
					} else {
						serverDocument.config.translated_messages[i].enabled_channel_ids = [];
						svr.channels.forEach(ch => {
							if(ch.type==0) {
								if(req.body[`translated_messages-${i}-enabled_channel_ids-${ch.id}`]=="on") {
									serverDocument.config.translated_messages[i].enabled_channel_ids.push(ch.id);
								}
							}
						});
					}
				}
				serverDocument.config.translated_messages.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console trivia sets
	app.get("/dashboard/commands/trivia-sets", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.query.i) {
				const triviaSetDocument = serverDocument.config.trivia_sets[req.query.i];
				if(triviaSetDocument) {
					res.json(triviaSetDocument.items);
				} else {
					res.redirect("/error");
				}
			} else {
				res.render("pages/admin-trivia-sets.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					serverData: {
						name: svr.name,
						id: svr.id,
						icon: svr.iconURL || "/static/img/discord-icon.png"
					},
					currentPage: req.path,
					configData: {
						trivia_sets: serverDocument.config.trivia_sets,
						commands: {
							trivia: {
								isEnabled: serverDocument.config.commands.trivia.isEnabled
							}
						}
					}
				});
			}
		});
	});
	io.of("/dashboard/commands/trivia-sets").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/commands/trivia-sets", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["new-name"] && req.body["new-items"] && !serverDocument.config.trivia_sets.id(req.body["new-name"])) {
				serverDocument.config.trivia_sets.push({
					_id: req.body["new-name"],
					items: JSON.parse(req.body["new-items"])
				});
			} else {
				for(let i=0; i<serverDocument.config.trivia_sets.length; i++) {
					if(req.body[`trivia_set-${i}-removed`]!=null) {
						serverDocument.config.trivia_sets[i] = null;
					}
				}
				serverDocument.config.trivia_sets.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console API keys
	app.get("/dashboard/commands/api-keys", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-api-keys.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				currentPage: req.path,
				configData: {
					custom_api_keys: serverDocument.config.custom_api_keys || {}
				}
			});
		});
	});
	io.of("/dashboard/commands/api-keys").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/commands/api-keys", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			serverDocument.config.custom_api_keys.google_api_key = req.body.google_api_key;
			serverDocument.config.custom_api_keys.google_cse_id = req.body.google_cse_id;

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console tag reaction
	app.get("/dashboard/commands/tag-reaction", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-tag-reaction.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				currentPage: req.path,
				configData: {
					tag_reaction: serverDocument.config.tag_reaction
				}
			});
		});
	});
	io.of("/dashboard/commands/tag-reaction").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/commands/tag-reaction", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["new-message"] && req.body["new-message"].length<=2000) {
				serverDocument.config.tag_reaction.messages.push(req.body["new-message"]);
			} else {
				serverDocument.config.tag_reaction.isEnabled = req.body.isEnabled=="on";
				for(let i=0; i<serverDocument.config.tag_reaction.messages.length; i++) {
					if(req.body[`tag_reaction-${i}-removed`]!=null) {
						serverDocument.config.tag_reaction.messages[i] = null;
					}
				}
				serverDocument.config.tag_reaction.messages.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console stats collection
	app.get("/dashboard/stats-points/stats-collection", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-stats-collection.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
				configData: {
					commands: {
						games: serverDocument.config.commands.games,
						messages: serverDocument.config.commands.messages,
						stats: serverDocument.config.commands.stats
					}
				},
				commandDescriptions: {
					games: bot.getPublicCommandMetadata("games").description,
					messages: bot.getPublicCommandMetadata("messages").description,
					stats: bot.getPublicCommandMetadata("stats").description
				},
				commandCategories: {
					games: bot.getPublicCommandMetadata("games").category,
					messages: bot.getPublicCommandMetadata("messages").category,
					stats: bot.getPublicCommandMetadata("stats").category
				}
			});
		});
	});
	io.of("/dashboard/stats-points/stats-collection").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/stats-points/stats-collection", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			parseCommandOptions(svr, serverDocument, "stats", req.body);
			parseCommandOptions(svr, serverDocument, "games", req.body);
			parseCommandOptions(svr, serverDocument, "messages", req.body);

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console ranks
	app.get("/dashboard/stats-points/ranks", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-ranks.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: req.path,
				configData: {
					ranks_list: serverDocument.config.ranks_list.map(a => {
						a.members = serverDocument.members.filter(memberDocument => {
							return memberDocument.rank==a._id;
						}).length;
						return a;
					})
				}
			});
		});
	});
	io.of("/dashboard/stats-points/ranks").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/stats-points/ranks", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["new-name"] && req.body["new-max_score"] && !serverDocument.config.ranks_list.id(req.body["new-name"])) {
				serverDocument.config.ranks_list.push({
					_id: req.body["new-name"],
					max_score: req.body["new-max_score"],
					role_id: req.body["new-role_id"] || null
				});
			} else {
				for(let i=0; i<serverDocument.config.ranks_list.length; i++) {
					if(req.body[`rank-${i}-removed`]!=null) {
						serverDocument.config.ranks_list[i] = null;
					} else {
						serverDocument.config.ranks_list[i].max_score = parseInt(req.body[`rank-${i}-max_score`]);
						if(serverDocument.config.ranks_list[i].role_id || req.body[`rank-${i}-role_id`]) {
							serverDocument.config.ranks_list[i].role_id = req.body[`rank-${i}-role_id`];
						}
					}
				}
				if(req.body["ranks_list-reset"]!=null) {
					for(let i=0; i<serverDocument.members.length; i++) {
						if(serverDocument.members[i].rank && serverDocument.members[i].rank!=serverDocument.config.ranks_list[0]._id) {
							serverDocument.members[i].rank = serverDocument.config.ranks_list[0]._id;
						}
					}
				}
			}
			serverDocument.config.ranks_list.spliceNullElements();
			serverDocument.config.ranks_list = serverDocument.config.ranks_list.sort((a, b) => {
				return a.max_score - b.max_score;
			});

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console AwesomePoints
	app.get("/dashboard/stats-points/awesome-points", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-awesome-points.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
				configData: {
					commands: {
						points: serverDocument.config.commands.points,
						lottery: serverDocument.config.commands.lottery
					}
				},
				commandDescriptions: {
					points: bot.getPublicCommandMetadata("points").description,
					lottery: bot.getPublicCommandMetadata("lottery").description
				},
				commandCategories: {
					points: bot.getPublicCommandMetadata("points").category,
					lottery: bot.getPublicCommandMetadata("lottery").category
				}
			});
		});
	});
	io.of("/dashboard/stats-points/awesome-points").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/stats-points/awesome-points", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			parseCommandOptions(svr, serverDocument, "points", req.body);
			parseCommandOptions(svr, serverDocument, "lottery", req.body);

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console admins
	app.get("/dashboard/management/admins", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-admins.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr).filter(role => {
					return serverDocument.config.admins.id(role.id)==null;
				}),
				currentPage: req.path,
				configData: {
					admins: serverDocument.config.admins.filter(adminDocument => {
						return svr.roles.has(adminDocument._id);
					}).map(adminDocument => {
						adminDocument.name = svr.roles.get(adminDocument._id).name;
						return adminDocument;
					}),
					auto_add_admins: serverDocument.config.auto_add_admins
				}
			});
		});
	});
	io.of("/dashboard/management/admins").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/management/admins", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["new-role_id"] && req.body["new-level"] && !serverDocument.config.admins.id(req.body["new-role_id"])) {
				serverDocument.config.admins.push({
					_id: req.body["new-role_id"],
					level: parseInt(req.body["new-level"])
				});
			} else {
				for(let i=0; i<serverDocument.config.admins.length; i++) {
					if(req.body[`admin-${i}-removed`]!=null) {
						serverDocument.config.admins[i] = null;
					}
				}
				serverDocument.config.admins.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console moderation
	app.get("/dashboard/management/moderation", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-moderation.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: req.path,
				configData: {
					moderation: {
						isEnabled: serverDocument.config.moderation.isEnabled,
						autokick_members: serverDocument.config.moderation.autokick_members,
						new_member_roles: serverDocument.config.moderation.new_member_roles
					},
					modlog: {
						isEnabled: serverDocument.modlog.isEnabled,
						channel_id: serverDocument.modlog.channel_id
					}
				}
			});
		});
	});
	io.of("/dashboard/management/moderation").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/management/moderation", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			serverDocument.config.moderation.isEnabled = req.body.isEnabled=="on";
			serverDocument.config.moderation.autokick_members.isEnabled = req.body["autokick_members-isEnabled"]=="on";
			serverDocument.config.moderation.autokick_members.max_inactivity = parseInt(req.body["autokick_members-max_inactivity"]);
			serverDocument.config.moderation.new_member_roles = [];
			svr.roles.forEach(role => {
				if(role.name!="@everyone" && role.name.indexOf("color-")!=0) {
					if(req.body[`new_member_roles-${role.id}`]=="on") {
						serverDocument.config.moderation.new_member_roles.push(role.id);
					}
				}
			});
			serverDocument.modlog.isEnabled = req.body["modlog-isEnabled"]=="on";
			serverDocument.modlog.channel_id = req.body["modlog-channel_id"];

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console blocked
	app.get("/dashboard/management/blocked", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-blocked.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				currentPage: req.path,
				configData: {
					blocked: svr.members.filter(member => {
						return serverDocument.config.blocked.indexOf(member.id)>-1;
					}).map(member => {
						return {
							name: member.user.username,
							id: member.id,
							avatar: member.user.avatarURL || "/static/img/discord-icon.png"
						};
					}).concat(config.global_blocklist.filter(usrid => {
						return svr.members.has(usrid);
					}).map(usrid => {
						const member = svr.members.get(usrid);
						return {
							name: member.user.username,
							id: member.id,
							avatar: member.user.avatarURL || "/static/img/discord-icon.png",
							isGlobal: true
						};
					})),
					moderation: {
						isEnabled: serverDocument.config.moderation.isEnabled
					}
				}
			});
		});
	});
	io.of("/dashboard/management/blocked").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/management/blocked", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["new-member"]) {
				const member = findQueryUser(req.body["new-member"], svr.members);
				if(member && serverDocument.config.blocked.indexOf(member.id)==-1 && bot.getUserBotAdmin(svr, serverDocument, member)==0) {
					serverDocument.config.blocked.push(member.id);
				}
			} else {
				for(let i=0; i<serverDocument.config.blocked.length; i++) {
					if(req.body[`block-${i}-removed`]!=null) {
						serverDocument.config.blocked[i] = null;
					}
				}
				serverDocument.config.blocked.spliceNullElements();
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console muted
	app.get("/dashboard/management/muted", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			const mutedMembers = [];
			svr.members.forEach(member => {
				const mutedChannels = [];
				svr.channels.filter(ch => {
					return ch.type==0;
				}).forEach(ch => {
					if(bot.isMuted(ch, member)) {
						mutedChannels.push(ch.id);
					}
				});
				if(mutedChannels.length>0) {
					mutedMembers.push({
						name: member.user.username,
						id: member.id,
						avatar: member.user.avatarURL || "/static/img/discord-icon.png",
						channels: mutedChannels
					});
				}
			});
			mutedMembers.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			res.render("pages/admin-muted.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
				configData: {
					moderation: {
						isEnabled: serverDocument.config.moderation.isEnabled
					}
				},
				muted: mutedMembers
			});
		});
	});
	io.of("/dashboard/management/muted").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/management/muted", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["new-member"] && req.body["new-channel_id"]) {
				const member = findQueryUser(req.body["new-member"], svr.members);
				const ch = svr.channels.get(req.body["new-channel_id"]);
				if(member && bot.getUserBotAdmin(svr, serverDocument, member)==0 && ch && !bot.isMuted(ch, member)) {
					bot.muteMember(ch, member, () => {
						res.redirect(req.originalUrl);
					});
				} else {
					res.redirect(req.originalUrl);
				}
			} else {
				svr.members.forEach(member => {
					svr.channels.forEach(ch => {
						if(ch.type==0) {
							if(bot.isMuted(ch, member) && (!req.body[`muted-${member.id}-${ch.id}`] || req.body[`muted-${member.id}-removed`]!=null)) {
								bot.unmuteMember(ch, member);
							} else if(!bot.isMuted(ch, member) && req.body[`muted-${member.id}-${ch.id}`]=="on") {
								bot.muteMember(ch, member);
							}
						}
					});
				});
				res.redirect(req.originalUrl);
			}
		});
	});

	// Admin console strikes
	app.get("/dashboard/management/strikes", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-strikes.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				currentPage: req.path,
				configData: {
					moderation: {
						isEnabled: serverDocument.config.moderation.isEnabled
					}
				},
				strikes: serverDocument.members.filter(memberDocument => {
					return svr.members.has(memberDocument._id) && memberDocument.strikes.length>0;
				}).map(memberDocument => {
					const member = svr.members.get(memberDocument._id);
					return {
						name: member.user.username,
						id: member.id,
						avatar: member.user.avatarURL || "/static/img/discord-icon.png",
						strikes: memberDocument.strikes.map(strikeDocument => {
							const creator = svr.members.get(strikeDocument._id) || {
								id: "invalid-user",
								user: {
									username: "invalid-user",
									avatarURL: "/static/img/discord-icon.png"
								}
							};
							return {
								creator: {
									name: creator.user.username,
									id: creator.id,
									avatar: creator.user.avatarURL || "/static/img/discord-icon.png"
								},
								reason: md.makeHtml(strikeDocument.reason),
								rawDate: moment(strikeDocument.timestamp).format(config.moment_date_format),
								relativeDate: moment(strikeDocument.timestamp).fromNow()
							};
						})
					};
				})
			});
		});
	});
	io.of("/dashboard/management/strikes").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/management/strikes", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["new-member"] && req.body["new-reason"]) {
				const member = findQueryUser(req.body["new-member"], svr.members);
				if(member && bot.getUserBotAdmin(svr, serverDocument, member)==0) {
					let memberDocument = serverDocument.members.id(member.id);
					if(!memberDocument) {
						serverDocument.members.push({_id: member.id});
						memberDocument = serverDocument.members.id(member.id);
					}
					memberDocument.strikes.push({
						_id: consolemember.id,
						reason: req.body["new-reason"]
					});
				}
			} else {
				for(const key in req.body) {
					const args = key.split("-");
					if(args[0]=="strikes" && !isNaN(args[1]) && args[2]=="removeall") {
						const memberDocument = serverDocument.members.id(args[1]);
						if(memberDocument) {
							memberDocument.strikes = [];
						}
					}
					else if(args[0]=="removestrike" && !isNaN(args[1]) && !isNaN(args[2])) {
						const memberDocument = serverDocument.members.id(args[1]);
						if(memberDocument) {
							memberDocument.strikes.splice(args[2], 1);
						}
					}
				}
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console status messages
	app.get("/dashboard/management/status-messages", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			const statusMessagesData = serverDocument.toObject().config.moderation.status_messages;
			for(let i=0; i<statusMessagesData.member_streaming_message.enabled_user_ids.length; i++) {
				const member = svr.members.get(statusMessagesData.member_streaming_message.enabled_user_ids[i]) || {user: {}};
				statusMessagesData.member_streaming_message.enabled_user_ids[i] = {
					name: member.user.username,
					id: member.id,
					avatar: member.user.avatarURL || "/static/img/discord-icon.png"
				};
			}
			res.render("pages/admin-status-messages.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
				configData: {
					moderation: {
						isEnabled: serverDocument.config.moderation.isEnabled,
						status_messages: statusMessagesData
					}
				}
			});
		});
	});
	io.of("/dashboard/management/status-messages").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/management/status-messages", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(Object.keys(req.body).length==1) {
				const args = Object.keys(req.body)[0].split("-");
				if(args[0]=="new" && serverDocument.config.moderation.status_messages[args[1]] && args[2]=="message") {
					if(args[1]=="member_streaming_message") {
						const member = findQueryUser(req.body[Object.keys(req.body)[0]], svr.members);
						if(member && serverDocument.config.moderation.status_messages[args[1]].enabled_user_ids.indexOf(member.id)==-1) {
							serverDocument.config.moderation.status_messages[args[1]].enabled_user_ids.push(member.id);
						}
					} else if(serverDocument.config.moderation.status_messages[args[1]].messages) {
						serverDocument.config.moderation.status_messages[args[1]].messages.push(req.body[Object.keys(req.body)[0]]);
					}
				}
			} else {
				for(const status_message in serverDocument.toObject().config.moderation.status_messages) {
					if(["new_member_pm", "member_removed_pm"].indexOf(status_message)==-1) {
						serverDocument.config.moderation.status_messages[status_message].channel_id = "";
					} else {
						serverDocument.config.moderation.status_messages[status_message].message_content = req.body[`${status_message}-message_content`];
					}
					for(const key in serverDocument.toObject().config.moderation.status_messages[status_message]) {
						switch(key) {
							case "isEnabled":
								serverDocument.config.moderation.status_messages[status_message][key] = req.body[`${status_message}-${key}`]=="on";
								break;
							case "enabled_channel_ids":
								serverDocument.config.moderation.status_messages[status_message][key] = [];
								svr.channels.forEach(ch => {
									if(ch.type==0) {
										if(req.body[`${status_message}-${key}-${ch.id}`]!=null) {
											serverDocument.config.moderation.status_messages[status_message][key].push(ch.id);
										}
									}
								});
								break;
							case "channel_id":
								if(["message_edited_message", "message_deleted_message"].indexOf(status_message)>-1 && req.body[`${status_message}-type`]=="msg") {
									break;
								}
							case "type":
								serverDocument.config.moderation.status_messages[status_message][key] = req.body[`${status_message}-${key}`];
								break;
						}
					}
					const key = status_message=="member_streaming_message" ? "enabled_user_ids" : "messages";
					if(serverDocument.config.moderation.status_messages[status_message][key]) {
						for(let i=0; i<serverDocument.config.moderation.status_messages[status_message][key].length; i++) {
							if(req.body[`${status_message}-${i}-removed`]!=null) {
								serverDocument.config.moderation.status_messages[status_message][key][i] = null;
							}
						}
						serverDocument.config.moderation.status_messages[status_message][key].spliceNullElements();
					}
				}
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console filters
	app.get("/dashboard/management/filters", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			const filteredCommands = [];
			for(const command in serverDocument.toObject().config.commands) {
				const commandData = bot.getPublicCommandMetadata(command);
				if(commandData && commandData.defaults.is_nsfw_filtered) {
					filteredCommands.push(command);
				}
			}
			res.render("pages/admin-filters.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: req.path,
				configData: {
					moderation: {
						isEnabled: serverDocument.config.moderation.isEnabled,
						filters: serverDocument.toObject().config.moderation.filters
					}
				},
				config: {
					filtered_commands: `<code>${filteredCommands.sort().join("</code>, <code>")}</code>`
				}
			});
		});
	});
	io.of("/dashboard/management/filters").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/management/filters", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			for(const filter in serverDocument.toObject().config.moderation.filters) {
				for(const key in serverDocument.toObject().config.moderation.filters[filter]) {
					switch(key) {
						case "isEnabled":
						case "delete_messages":
						case "delete_message":
							serverDocument.config.moderation.filters[filter][key] = req.body[`${filter}-${key}`]=="on";
							break;
						case "disabled_channel_ids":
							serverDocument.config.moderation.filters[filter][key] = [];
							svr.channels.forEach(ch => {
								if(ch.type==0) {
									if(req.body[`${filter}-${key}-${ch.id}`]!="on") {
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

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console message of the day
	app.get("/dashboard/management/message-of-the-day", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-message-of-the-day.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: req.path,
				configData: {
					message_of_the_day: serverDocument.config.message_of_the_day
				}
			});
		});
	});
	io.of("/dashboard/management/message-of-the-day").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/management/message-of-the-day", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			const alreadyEnabled = serverDocument.config.message_of_the_day.isEnabled;
			serverDocument.config.message_of_the_day.isEnabled = req.body.isEnabled=="on";
			serverDocument.config.message_of_the_day.message_content = req.body.message_content;
			serverDocument.config.message_of_the_day.channel_id = req.body.channel_id;
			serverDocument.config.message_of_the_day.interval = parseInt(req.body.interval);

			if(!alreadyEnabled && serverDocument.config.message_of_the_day.isEnabled) {
				createMessageOfTheDay(bot, winston, svr, serverDocument.config.message_of_the_day);
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console voicetext channels
	app.get("/dashboard/management/voicetext-channels", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-voicetext-channels.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				voiceChannelData: getChannelData(svr, 2),
				currentPage: req.path,
				configData: {
					voicetext_channels: serverDocument.config.voicetext_channels
				}
			});
		});
	});
	io.of("/dashboard/management/voicetext-channels").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/management/voicetext-channels", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			serverDocument.config.voicetext_channels = [];
			svr.channels.forEach(ch=> {
				if(ch.type==2) {
					if(req.body[`voicetext_channels-${ch.id}`]=="on") {
						serverDocument.config.voicetext_channels.push(ch.id);
					}
				}
			});

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console roles
	app.get("/dashboard/management/roles", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-roles.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				roleData: getRoleData(svr),
				currentPage: req.path,
				configData: {
					commands: {
						perms: serverDocument.config.commands.perms,
						role: serverDocument.config.commands.role,
						roleinfo: serverDocument.config.commands.roleinfo
					},
					custom_roles: serverDocument.config.custom_roles
				},
				commandDescriptions: {
					perms: bot.getPublicCommandMetadata("perms").description,
					role: bot.getPublicCommandMetadata("role").description,
					roleinfo: bot.getPublicCommandMetadata("roleinfo").description
				},
				commandCategories: {
					perms: bot.getPublicCommandMetadata("perms").category,
					role: bot.getPublicCommandMetadata("role").category,
					roleinfo: bot.getPublicCommandMetadata("roleinfo").category
				}
			});
		});
	});
	io.of("/dashboard/management/roles").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/management/roles", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			parseCommandOptions(svr, serverDocument, "roleinfo", req.body);
			parseCommandOptions(svr, serverDocument, "role", req.body);
			serverDocument.config.custom_roles = [];
			svr.roles.forEach(role => {
				if(role.name!="@everyone" && role.name.indexOf("color-")!=0) {
					if(req.body[`custom_roles-${role.id}`]=="on") {
						serverDocument.config.custom_roles.push(role.id);
					}
				}
			});
			parseCommandOptions(svr, serverDocument, "perms", req.body);

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console logs
	app.get("/dashboard/management/logs", (req, res) => {
		checkAuth(req, res, (consolemember, svr) => {
			winston.query({
				from: new Date - 48 * 60 * 60 * 1000,
				until: new Date,
				limit: 500,
				order: "desc"
			}, (err, results) => {
				if(err) {
					res.redirect("/error");
				} else {
					results = results.file;
					const logs = [];
					for(let i=0; i<results.length; i++) {
						if(results[i].svrid && svr.id==results[i].svrid && (!req.query.q || results[i].message.toLowerCase().indexOf(req.query.q.toLowerCase())>-1) && (!req.query.chid || results[i].chid==req.query.chid)) {
							delete results[i].svrid;
							const ch = results[i].chid ? svr.channels.get(results[i].chid) : null;
							if(results[i].chid) {
								results[i].ch = ch ? ch.name : "invalid-channel";
							}
							const member = results[i].usrid ? svr.members.get(results[i].usrid) : null;
							if(results[i].usrid) {
								results[i].usr = member ? (`${member.user.username}#${member.user.discriminator}`) : "invalid-user";
							}
							switch(results[i].level) {
								case "warn":
									results[i].level = "exclamation";
									results[i].levelColor = "#ffdd57";
									break;
								case "error":
									results[i].level = "times";
									results[i].levelColor = "#ff3860";
									break;
								default:
									results[i].level = "info";
									results[i].levelColor = "#3273dc";
									break;
							}
							results[i].timestamp = moment(results[i].timestamp).format(config.moment_date_format);
							logs.push(results[i]);
						}
					}

					res.render("pages/admin-logs.ejs", {
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						serverData: {
							name: svr.name,
							id: svr.id,
							icon: svr.iconURL || "/static/img/discord-icon.png"
						},
						channelData: getChannelData(svr),
						currentPage: req.path,
						logData: logs,
						searchQuery: req.query.q,
						channelQuery: req.query.chid
					});
				}
			});
		});
	});

	// Admin console name display
	app.get("/dashboard/other/name-display", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-name-display.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				currentPage: req.path,
				configData: {
					name_display: serverDocument.config.name_display
				},
				nameExample: bot.getName(svr, serverDocument, consolemember)
			});
		});
	});
	io.of("/dashboard/management/name-display").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/other/name-display", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			serverDocument.config.name_display.use_nick = req.body["name_display-use_nick"]=="on";
			serverDocument.config.name_display.show_discriminator = req.body["name_display-show_discriminator"]=="on";

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console ongoing activities
	app.get("/dashboard/other/ongoing-activities", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			const ongoingTrivia = [];
			const ongoingPolls = [];
			const ongoingGiveaways = [];
			const ongoingLotteries = [];
			serverDocument.channels.forEach(channelDocument => {
				const ch = svr.channels.get(channelDocument._id);
				if(ch) {
					if(channelDocument.trivia.isOngoing) {
						ongoingTrivia.push({
							channel: {
								name: ch.name,
								id: ch.id
							},
							set: channelDocument.trivia.set_id,
							score: channelDocument.trivia.score,
							max_score: channelDocument.trivia.max_score,
							responders: channelDocument.trivia.responders.length
						});
					}
					if(channelDocument.poll.isOngoing) {
						const creator = svr.members.get(channelDocument.poll.creator_id) || {user: "invalid-user"};
						ongoingPolls.push({
							title: channelDocument.poll.title,
							channel: {
								name: ch.name,
								id: ch.id
							},
							rawCreated: moment(channelDocument.poll.created_timestamp).format(config.moment_date_format),
							relativeCreated: moment(channelDocument.poll.created_timestamp).fromNow(),
							creator: creator.user.username,
							options: channelDocument.poll.options.length,
							responses: channelDocument.poll.responses.length
						});
					}
					if(channelDocument.giveaway.isOngoing) {
						const creator = svr.members.get(channelDocument.giveaway.creator_id) || {user: "invalid-user"};
						ongoingGiveaways.push({
							title: channelDocument.giveaway.title,
							channel: {
								name: ch.name,
								id: ch.id
							},
							creator: creator.user.username,
							rawExpiry: moment(channelDocument.giveaway.expiry_timestamp).format(config.moment_date_format),
							relativeExpiry: Math.ceil((channelDocument.giveaway.expiry_timestamp - Date.now()) / 3600000),
							participants: channelDocument.giveaway.participant_ids.length
						});
					}
					if(channelDocument.lottery.isOngoing) {
						ongoingLotteries.push({
							channel: {
								name: ch.name,
								id: ch.id
							},
							participants: channelDocument.giveaway.participant_ids.length
						});
					}
				}
			});
			res.render("pages/admin-ongoing-activities.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png",
					defaultChannel: svr.defaultChannel.name
				},
				currentPage: req.path,
				trivia: ongoingTrivia,
				polls: ongoingPolls,
				giveaways: ongoingGiveaways,
				lotteries: ongoingLotteries,
				commandPrefix: bot.getCommandPrefix(svr, serverDocument)
			});
		});
	});
	io.of("/dashboard/management/ongoing-activities").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/other/ongoing-activities", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(req.body["end-type"] && req.body["end-id"]) {
				const ch = svr.channels.get(req.body["end-id"]);
				if(ch) {
					let channelDocument = serverDocument.channels.id(ch.id);
					if(!channelDocument) {
						serverDocument.channels.push({_id: ch.id});
						channelDocument = serverDocument.channels.id(ch.id);
					}

					switch(req.body["end-type"]) {
						case "trivia":
							Trivia.end(bot, svr, serverDocument, ch, channelDocument);
							break;
						case "poll":
							Polls.end(serverDocument, ch, channelDocument);
							break;
						case "giveaway":
							Giveaways.end(bot, svr, serverDocument, ch, channelDocument);
							break;
						case "lottery":
							Lotteries.end(db, svr, serverDocument, ch, channelDocument);
							break;
					}
				}
			}

			saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
		});
	});

	// Admin console public data
	app.get("/dashboard/other/public-data", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.render("pages/admin-public-data.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				currentPage: req.path,
				configData: {
					public_data: serverDocument.config.public_data
				}
			});
		});
	});
	io.of("/dashboard/other/public-data").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/other/public-data", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			serverDocument.config.public_data.isShown = req.body.isShown=="on";
			let createInvite = false;
			if(!serverDocument.config.public_data.server_listing.isEnabled && req.body["server_listing-isEnabled"]=="on") {
				createInvite = true;
			}
			serverDocument.config.public_data.server_listing.isEnabled = req.body["server_listing-isEnabled"]=="on";
			serverDocument.config.public_data.server_listing.category = req.body["server_listing-category"];
			serverDocument.config.public_data.server_listing.description = req.body["server_listing-description"];
			if(createInvite) {
				svr.defaultChannel.createInvite({
					maxAge: 0,
					maxUses: 0
				}).then(invite => {
					if(invite) {
						serverDocument.config.public_data.server_listing.invite_link = `https://discord.gg/${invite.code}`;
					}
					saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
				});
			} else if(serverDocument.config.public_data.server_listing.invite_link) {
				svr.defaultChannel.getInvites().then(invites => {
					if(invites) {
						const inviteToDelete = invites.find(invite => {
							return (`https://discord.gg/${invite.code}`)==serverDocument.config.public_data.server_listing.invite_link;
						});
						if(inviteToDelete) {
							inviteToDelete.delete().then(() => {
								saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
							});
						} else {
							saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
						}
					}
				});
			} else {
				saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
			}
		});
	});

	// Admin console extensions
	app.get("/dashboard/other/extensions", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			const extensionData = serverDocument.toObject().extensions;
			extensionData.forEach(extensionDocument => {
				extensionDocument.store = sizeof(extensionDocument.store);
			});
			res.render("pages/admin-extensions.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				currentPage: req.path,
				configData: {
					extensions: extensionData
				}
			});
		});
	});
	io.of("/dashboard/other/extensions").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/other/extensions", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(Object.keys(req.body).length==1 && Object.keys(req.body)[0].indexOf("new-")==0) {
				const state = Object.keys(req.body)[0].split("-")[1];
				db.gallery.findOne({
					_id: req.body[Object.keys(req.body)[0]],
					state
				}, (err, galleryDocument) => {
					if(!err && galleryDocument) {
						let extensionDocument = serverDocument.extensions.id(galleryDocument._id);
						let isUpdate = true;
						if(!extensionDocument) {
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

						if(isUpdate) {
							io.of("/dashboard/other/extension-builder").emit("update", svr.id);
						} else {
							extensionDocument.admin_level = ["command", "keyword"].indexOf(galleryDocument.type)>-1 ? 0 : null;
							extensionDocument.enabled_channel_ids = [svr.defaultChannel.id];
							extensionDocument.store = {};
							serverDocument.extensions.push(extensionDocument);
						}

						try {
							writeFile(`${__dirname}/../Extensions/${svr.id}-${extensionDocument._id}.abext`, fs.readFileSync(`${__dirname}/../Extensions/gallery-${req.body[Object.keys(req.body)[0]]}.abext`), () => {
								saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
							});
						} catch(err) {
							saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
						}
					} else {
						res.sendStatus(500);
					}
				});
			} else {
				for(let i=0; i<serverDocument.extensions.length; i++) {
					if(req.body[`extension-${i}-removed`]!=null) {
						try {
							fs.unlinkSync(`${__dirname}/../Extensions/${svr.id}-${serverDocument.extensions[i]._id}.abext`);
						} catch(err) {
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
	app.get("/dashboard/other/extension-builder", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			let extensionData = {};
			if(req.query.extid) {
				extensionData = serverDocument.extensions.id(req.query.extid);
				if(!extensionData) {
					res.redirect("/error");
					return;
				} else {
					try {
						extensionData.code = fs.readFileSync(`${__dirname}/../Extensions/${svr.id}-${extensionData._id}.abext`);
					} catch(err) {
						extensionData.code = "";
					}
				}
			}
			res.render("pages/admin-extension-builder.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: svr.name,
					id: svr.id,
					icon: svr.iconURL || "/static/img/discord-icon.png"
				},
				channelData: getChannelData(svr),
				currentPage: req.path,
				extensionData
			});
		});
	});
	io.of("/dashboard/other/extension-builder").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/other/extension-builder", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			if(validateExtensionData(req.body)) {
				let extensionDocument = serverDocument.extensions.id(req.query.extid);
				let isUpdate = true;
				if(!extensionDocument) {
					extensionDocument = {};
					isUpdate = false;
				}
				const enabled_channel_ids = [];
				svr.channels.forEach(ch => {
					if(ch.type==0) {
						if(req.body[`enabled_channel_ids-${ch.id}`]=="on") {
							enabled_channel_ids.push(ch.id);
						}
					}
				});
				extensionDocument.level = "third";
				extensionDocument.enabled_channel_ids = enabled_channel_ids;
				extensionDocument.admin_level = req.body[`${req.body.type}-admin_level`];
				extensionDocument = writeExtensionData(extensionDocument, req.body);

				if(!isUpdate) {
					serverDocument.extensions.push(extensionDocument);
					extensionDocument._id = serverDocument.extensions[serverDocument.extensions.length-1]._id;
					if(!req.query.extid) {
						req.originalUrl += `&extid=${extensionDocument._id}`;
					}
					io.of("/dashboard/other/extensions").emit("update", svr.id);
				}

				writeFile(`${__dirname}/../Extensions/${svr.id}-${extensionDocument._id}.abext`, req.body.code, () => {
					saveAdminConsoleOptions(consolemember, svr, serverDocument, req, res);
				});
			} else {
				res.redirect("/error");
			}
		});
	});

	// Admin console export configs
	app.get("/dashboard/other/export", (req, res) => {
		checkAuth(req, res, (consolemember, svr, serverDocument) => {
			res.json(serverDocument.toObject().config);
		});
	});

	// Maintainer console overview
	app.get("/dashboard/maintainer", (req, res) => {
		checkAuth(req, res, () => {
			db.servers.aggregate({
				$group: {
					_id: null,
					total: {
						$sum: {
							$add: ["$messages_today"]
						}
					}
				}
			}, (err, result) => {
				let messageCount = 0;
				if(!err && result) {
					messageCount = result[0].total;
				}
				Updater.check(config, version => {
					res.render("pages/maintainer.ejs", {
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						serverData: {
							name: bot.user.username,
							id: bot.user.id,
							icon: bot.user.avatarURL || "/static/img/discord-icon.png",
							isMaintainer: true
						},
						currentPage: req.path,
						serverCount: bot.guilds.size,
						userCount: bot.users.size,
						totalMessageCount: messageCount,
						roundedUptime: getRoundedUptime(process.uptime()),
						shardCount: bot.shards.size,
						version: config.version,
						utd: version["up-to-date"],
						disabled: version==404
					});
				})
			});
		});
	});

	// Maintainer console bot version
	app.get("/dashboard/maintainer/version", (req, res) => {
		checkAuth(req, res, () => {
			Updater.check(config, version => {
				if (version === 404) {
					res.render("pages/maintainer-version.ejs", {
						disabled: true,
						utd: false,
						version: config.version,
						branch: config.branch,
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						serverData: {
							name: bot.user.username,
							id: bot.user.id,
							icon: bot.user.avatarURL || "/static/img/discord-icon.png",
							isMaintainer: true
						},
						currentPage: req.path
					})
				} else if (!version["up-to-date"]) {
					version.latest.config.changelog = md.makeHtml(version.latest.config.changelog)
					res.render("pages/maintainer-version.ejs", {
						disabled: false,
						version: config.version,
						branch: config.branch,
						versionn: JSON.stringify(version.latest),
						utd: false,
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						serverData: {
							name: bot.user.username,
							id: bot.user.id,
							icon: bot.user.avatarURL || "/static/img/discord-icon.png",
							isMaintainer: true
						},
						currentPage: req.path
					})
				} else {
					res.render("pages/maintainer-version.ejs", {
						disabled: false,
						version: config.version,
						branch: config.branch,
						versionn: JSON.stringify(version.latest),
						utd: true,
						authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
						serverData: {
							name: bot.user.username,
							id: bot.user.id,
							icon: bot.user.avatarURL || "/static/img/discord-icon.png",
							isMaintainer: true
						},
						currentPage: req.path
					});
				}
			});
		});
	});
	app.post("/dashboard/maintainer/version", (req, res) => {
		checkAuth(req, res, () => {
			io.of("/dashboard/maintainer/version").on("connection", socket => {
				socket.on("update", (data) => {
					if (data == "start") {
						socket.emit("update", "prepair")
						Updater.update(bot, config, socket, winston)
					}
				})
			});
			//unirest.post("https://status.gilbertgobbels.xyz/updates/stats").send(bot.user).end(() => {});
			res.send("OK")
		})
	})
	
	// Maintainer console server list
	app.get("/dashboard/servers/server-list", (req, res) => {
		checkAuth(req, res, () => {
			const renderPage = data => {
				res.render("pages/maintainer-server-list.ejs", {
					authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
					serverData: {
						name: bot.user.username,
						id: bot.user.id,
						icon: bot.user.avatarURL || "/static/img/discord-icon.png",
						isMaintainer: true
					},
					currentPage: req.path,
					activeSearchQuery: req.query.q,
					selectedServer: req.query.i || "0",
					data
				});
			};

			if(req.query.q) {
				const query = req.query.q.toLowerCase();
				const data = bot.guilds.filter(svr => {
					return svr.name.toLowerCase().indexOf(query)>-1 || svr.id==query || svr.members.get(svr.ownerID).user.username.toLowerCase().indexOf(query)>-1;
				}).map(svr => {
					return {
						name: svr.name,
						id: svr.id,
						icon: svr.iconURL || "/static/img/discord-icon.png",
						channelData: getChannelData(svr)
					};
				});

				if(req.query.message) {
					const svr = bot.guilds.get(data[parseInt(req.query.i)].id);
					if(svr) {
						const ch = svr.channels.get(req.query.chid);
						if(ch) {
							ch.createMessage(req.query.message);
							req.query.q = "";
							renderPage();
						} else {
							res.redirect("/error");
						}
					} else {
						res.redirect("/error");
					}
				} else if(req.query.leave!=undefined) {
					const svr = bot.guilds.get(data[parseInt(req.query.i)].id);
					if(svr) {
						bot.leaveGuild(svr.id).then(() => {
							req.query.q = "";
							renderPage();
						}).catch(() => {
							res.redirect("/error");
						});
					} else {
						res.redirect("/error");
					}
				} else {
					renderPage(data);
				}
			} else {
				renderPage();
			}
		});
	});

	// Maintainer console big message
	app.get("/dashboard/servers/big-message", (req, res) => {
		checkAuth(req, res, () => {
			res.render("pages/maintainer-big-message.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: bot.user.username,
					id: bot.user.id,
					icon: bot.user.avatarURL || "/static/img/discord-icon.png",
					isMaintainer: true
				},
				currentPage: req.path,
				serverCount: bot.guilds.size
			});
		});
	});
	app.post("/dashboard/servers/big-message", (req, res) => {
		checkAuth(req, res, () => {
			if(req.body.message) {
				bot.guilds.forEach(svr => {
					svr.defaultChannel.createMessage(req.body.message).then(() => {}, (err) => {
						winston.error(err)
					});
				});
			}
			res.redirect(req.originalUrl);
		});
	});

	// Maintainer console blocklist
	app.get("/dashboard/global-options/blocklist", (req, res) => {
		checkAuth(req, res, () => {
			res.render("pages/maintainer-blocklist.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: bot.user.username,
					id: bot.user.id,
					icon: bot.user.avatarURL || "/static/img/discord-icon.png",
					isMaintainer: true
				},
				currentPage: req.path,
				config: {
					global_blocklist: config.global_blocklist.map(a => {
						const usr = bot.users.get(a) || {};
						return {
							name: usr.username,
							id: usr.id,
							avatar: usr.avatarURL || "/static/img/discord-icon.png"
						};
					})
				}
			});
		});
	});
	io.of("/dashboard/global-options/blocklist").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/global-options/blocklist", (req, res) => {
		checkAuth(req, res, consolemember => {
			if(req.body["new-user"]) {
				const usr = findQueryUser(req.body["new-user"], bot.users);
				if(usr && config.global_blocklist.indexOf(usr.id)==-1 && config.maintainers.indexOf(usr.id)==-1) {
					config.global_blocklist.push(usr.id);
				}
			} else {
				for(let i=0; i<config.global_blocklist.length; i++) {
					if(req.body[`block-${i}-removed`]!=null) {
						config.global_blocklist[i] = null;
					}
				}
				config.global_blocklist.spliceNullElements();
			}

			saveMaintainerConsoleOptions(consolemember, req, res);
		});
	});

	// Maintainer console bot user options
	app.get("/dashboard/global-options/bot-user", (req, res) => {
		checkAuth(req, res, () => {
			const sampleBotMember = bot.getFirstMember(bot.user);
			res.render("pages/maintainer-bot-user.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: bot.user.username,
					id: bot.user.id,
					icon: bot.user.avatarURL || "/static/img/discord-icon.png",
					isMaintainer: true
				},
				currentPage: req.path,
				bot_user: {
					status: sampleBotMember.status,
					game: bot.getGame(sampleBotMember),
					game_default: config.game=="default",
					avatar: bot.user.avatarURL
				}
			});
		});
	});
	io.of("/dashboard/global-options/bot-user").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/global-options/bot-user", (req, res) => {
		checkAuth(req, res, consolemember => {
			const updateBotUser = avatar => {
				bot.editSelf({
					avatar: avatar ? (`data:image/jpeg;base64,${avatar}`) : null,
					username: req.body.username
				}).then(() => {
					let game = {
						name: req.body.game
					};
					config.game = req.body.game;
					if(req.body.game=="awesomebot.xyz" || req.body["game-default"]!=null) {
						config.game = "default";
						game = {
							name: "awesomebot.xyz",
							url: "http://awesomebot.xyz"
						};
					}
					bot.editStatus(req.body.status, game);
					saveMaintainerConsoleOptions(consolemember, req, res);
				}, (err) => {
					winston.error(err)
				});
			};

			if(req.body.avatar) {
				base64.encode(req.body.avatar, {
					string: true
				}, (err, data) => {
					updateBotUser(data);
				});
			} else {
				base64.encode(bot.user.avatarURL.replace(".jpg",".webp"), {
					string: true
				}, (err, data) => {
					updateBotUser(data);
				});
			}
		});
	});

	// Maintainer console homepage options
	app.get("/dashboard/global-options/homepage", (req, res) => {
		checkAuth(req, res, () => {
			res.render("pages/maintainer-homepage.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: bot.user.username,
					id: bot.user.id,
					icon: bot.user.avatarURL || "/static/img/discord-icon.png",
					isMaintainer: true
				},
				currentPage: req.path,
				config: {
					header_image: config.header_image,
					homepage_message_html: config.homepage_message_html
				},
				dirname: __dirname
			});
		});
	});
	io.of("/dashboard/global-options/homepage").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/global-options/homepage", (req, res) => {
		checkAuth(req, res, consolemember => {
			config.homepage_message_html = req.body.homepage_message_html;
			config.header_image = req.body.header_image;

			saveMaintainerConsoleOptions(consolemember, req, res);
		});
	});

	// Maintainer console maintainers
	app.get("/dashboard/global-options/maintainers", (req, res) => {
		checkAuth(req, res, consolemember => {
			res.render("pages/maintainer-maintainers.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: bot.user.username,
					id: bot.user.id,
					icon: bot.user.avatarURL || "/static/img/discord-icon.png",
					isMaintainer: true
				},
				currentPage: req.path,
				config: {
					maintainers: config.maintainers.map(a => {
						const usr = bot.users.get(a) || {
							id: "invalid-user",
							username: "invalid-user"
						};
						return {
							name: usr.username,
							id: usr.id,
							avatar: usr.avatarURL || "/static/img/discord-icon.png"
						};
					})
				},
				showRemove: consolemember.id==config.maintainers[0]
			});
		});
	});
	io.of("/dashboard/global-options/maintainers").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/global-options/maintainers", (req, res) => {
		checkAuth(req, res, consolemember => {
			if(req.body["new-user"]) {
				const usr = findQueryUser(req.body["new-user"], bot.users);
				if(usr && config.maintainers.indexOf(usr.id)==-1) {
					config.maintainers.push(usr.id);
				}
			} else {
				if(consolemember.id==config.maintainers[0]) {
					for(let i=0; i<config.maintainers.length; i++) {
						if(req.body[`maintainer-${i}-removed`]!=null) {
							config.maintainers[i] = null;
						}
					}
					config.maintainers.spliceNullElements();
				}
			}

			saveMaintainerConsoleOptions(consolemember, req, res);
		});
	});

	// Maintainer console wiki contributors
	app.get("/dashboard/global-options/wiki-contributors", (req, res) => {
		checkAuth(req, res, consolemember => {
			res.render("pages/maintainer-wiki-contributors.ejs", {
				authUser: req.isAuthenticated() ? getAuthUser(req.user) : null,
				serverData: {
					name: bot.user.username,
					id: bot.user.id,
					icon: bot.user.avatarURL || "/static/img/discord-icon.png",
					isMaintainer: true
				},
				currentPage: req.path,
				config: {
					wiki_contributors: config.maintainers.map(a => {
						const usr = bot.users.get(a) || {
							id: "invalid-user",
							username: "invalid-user"
						};
						return {
							name: usr.username,
							id: usr.id,
							avatar: usr.avatarURL || "/static/img/discord-icon.png",
							isMaintainer: true
						};
					}).concat(config.wiki_contributors.map((a, i) => {
						const usr = bot.users.get(a) || {
							id: "invalid-user",
							username: "invalid-user"
						};
						return {
							name: usr.username,
							id: usr.id,
							avatar: usr.avatarURL || "/static/img/discord-icon.png",
							index: i
						};
					}))
				},
				showRemove: config.maintainers.includes(consolemember.id)
			});
		});
	});
	io.of("/dashboard/global-options/wiki-contributors").on("connection", socket => {
		socket.on("disconnect", () => {});
	});
	app.post("/dashboard/global-options/wiki-contributors", (req, res) => {
		checkAuth(req, res, consolemember => {
			if(req.body["new-user"]) {
				const usr = findQueryUser(req.body["new-user"], bot.users);
				if(usr && config.wiki_contributors.indexOf(usr.id)==-1) {
					config.wiki_contributors.push(usr.id);
				}
			} else {
				if(config.maintainers.includes(consolemember.id)) {
					for(let i=0; i<config.wiki_contributors.length; i++) {
						if(req.body[`contributor-${i}-removed`]!=null) {
							config.wiki_contributors[i] = null;
						}
					}
					config.wiki_contributors.spliceNullElements();
				}
			}

			saveMaintainerConsoleOptions(consolemember, req, res);
		});
	});

	// Under construction for v4
	app.get("/under-construction", (req, res) => {
		res.render("pages/uc.ejs");
	});

	// Logout of admin console
	app.get("/logout", (req, res) => {
		req.logout();
		res.redirect("/activity");
	});

	// Error page
	app.get("/error", (req, res) => {
		res.status(500).render("pages/error.ejs");
	});
		
	// 404 page
	app.use(function(req, res, next){
		res.status(404).render("pages/404.ejs");
	})
};

Object.assign(Array.prototype, {
	spliceNullElements() {
		for(let i=0; i<this.length; i++) {
			if(this[i]==null) {
				this.splice(i, 1);
				i--;
			}
		}
	}
});
