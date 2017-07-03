// Import and setup files and modules
const eventHandlers = {
	ready: require("./Events/ready.js"),
	guildCreate: require("./Events/guildCreate.js"),
	guildUpdate: require("./Events/guildUpdate.js"),
	guildDelete: require("./Events/guildDelete.js"),
	channelDelete: require("./Events/channelDelete.js"),
	guildRoleDelete: require("./Events/guildRoleDelete.js"),
	guildMemberAdd: require("./Events/guildMemberAdd.js"),
	guildMemberUpdate: require("./Events/guildMemberUpdate.js"),
	guildMemberRemove: require("./Events/guildMemberRemove.js"),
	guildBanAdd: require("./Events/guildBanAdd.js"),
	guildBanRemove: require("./Events/guildBanRemove.js"),
	messageCreate: require("./Events/messageCreate.js"),
	messageUpdate: require("./Events/messageUpdate.js"),
	messageDelete: require("./Events/messageDelete.js"),
	presenceUpdate: require("./Events/presenceUpdate.js"),
	userUpdate: require("./Events/userUpdate.js"),
	voiceChannelJoin: require("./Events/voiceChannelJoin.js"),
	voiceStateUpdate: require("./Events/voiceStateUpdate.js"),
	voiceChannelLeave: require("./Events/voiceChannelLeave.js"),
};
const database = require("./Database/Driver.js");

const auth = require("./Configuration/auth.json");
const config = require("./Configuration/config.json");
const winston = require("winston");

const hastebin = require("./Modules/HastebinUpload.js");
const util = require("util");

// Set up default winston logger
winston.add(winston.transports.File, {
	filename: "bot-out.log",
});

/* eslint-disable max-len */
// Connect to and initialize database
database.initialize(config.db_url, dbError => {
	if (dbError) {
		winston.error("Failed to connect to database, maybe its off?\n", dbError);
	} else {
		const db = database.get();

		// Get bot client from platform and login
		const bot = require("./Platform/Platform.js")(db, auth, config);

		bot.connect().then(() => {
			winston.info("Started bot application");
		}).catch(discordError => {
			winston.error("Failed to connect to Discord :/", discordError);
		});

		// Initialise all the Object.assigns
		require("./Modules/ObjectDefines.js")(winston);

		/* After guilds and users have been created (first-time only)
		 * Will also trigger the shard message information
		 */
		bot.once("ready", () => {
			eventHandlers.ready(bot, db, config, winston);
		});

		// Server joined by bot
		bot.on("guildCreate", svr => {
			if (bot.isReady) {
				eventHandlers.guildCreate(bot, db, config, winston, svr).catch(err => {
					winston.error(err);
				});
			}
		});

		// Server details updated (name, icon, etc.)
		bot.on("guildUpdate", (svr, oldsvrdata) => {
			if (bot.isReady) {
				eventHandlers.guildUpdate(bot, db, config, winston, svr, oldsvrdata).catch(err => {
					winston.error(err);
				});
			}
		});

		// Server left by bot or deleted
		bot.on("guildDelete", (svr, unavailable) => {
			if (bot.isReady && !unavailable) {
				eventHandlers.guildDelete(bot, db, config, winston, svr).catch(err => {
					winston.error(err);
				});
			} else if (unavailable) {
				winston.error("Server returned unavailable, possible Discord Outage", { svrid: svr.id });
			}
		});

		// Server channel deleted
		bot.on("channelDelete", ch => {
			if (bot.isReady) {
				eventHandlers.channelDelete(bot, db, config, winston, ch).catch(err => {
					winston.error(err);
				});
			}
		});

		// Server role deleted
		bot.on("guildRoleDelete", (svr, role) => {
			if (bot.isReady) {
				eventHandlers.guildRoleDelete(bot, db, config, winston, svr, role).catch(err => {
					winston.error(err);
				});
			}
		});

		// User joined server
		bot.on("guildMemberAdd", (svr, member) => {
			if (bot.isReady) {
				eventHandlers.guildMemberAdd(bot, db, config, winston, svr, member).catch(err => {
					winston.error(err);
				});
			}
		});

		// User details updated on server (role, nickname, etc.)
		bot.on("guildMemberUpdate", (svr, member, oldmemberdata) => {
			if (bot.isReady) {
				eventHandlers.guildMemberUpdate(bot, db, config, winston, svr, member, oldmemberdata).catch(err => {
					winston.error(err);
				});
			}
		});

		// User left or kicked from server
		bot.on("guildMemberRemove", (svr, member) => {
			if (bot.isReady) {
				eventHandlers.guildMemberRemove(bot, db, config, winston, svr, member).catch(err => {
					winston.error(err);
				});
			}
		});

		// User banned from server
		bot.on("guildBanAdd", (svr, usr) => {
			if (bot.isReady) {
				eventHandlers.guildBanAdd(bot, db, config, winston, svr, usr).catch(err => {
					winston.error(err);
				});
			}
		});

		// User unbanned from server
		bot.on("guildBanRemove", (svr, usr) => {
			if (bot.isReady) {
				eventHandlers.guildBanRemove(bot, db, config, winston, svr, usr).catch(err => {
					winston.error(err);
				});
			}
		});

		// Message sent on server
		bot.on("messageCreate", msg => {
			if (bot.isReady) {
				eventHandlers.messageCreate(bot, db, config, winston, msg).catch(err => {
					winston.error(err);
				});
			}
		});

		// Message edited
		bot.on("messageUpdate", (newMsg, oldMsg) => {
			if (bot.isReady) {
				eventHandlers.messageUpdate(bot, db, winston, newMsg, oldMsg).catch(err => {
					winston.error(err);
				});
			}
		});

		// Message deleted
		bot.on("messageDelete", msg => {
			if (bot.isReady) {
				eventHandlers.messageDelete(bot, db, config, winston, msg).catch(err => {
					winston.error(err);
				});
			}
		});

		// User status changed (afk, new game, etc.)
		bot.on("presenceUpdate", (member, oldpresence) => {
			if (bot.isReady) {
				eventHandlers.presenceUpdate(bot, db, config, winston, member, oldpresence).catch(err => {
					winston.error(err);
				});
			}
		});

		// User updated (name, avatar, etc.)
		bot.on("userUpdate", (usr, oldusrdata) => {
			if (bot.isReady) {
				eventHandlers.userUpdate(bot, db, config, winston, usr, oldusrdata).catch(err => {
					winston.error(err);
				});
			}
		});

		// User joined server voice channel
		bot.on("voiceChannelJoin", (member, ch) => {
			if (bot.isReady) {
				eventHandlers.voiceChannelJoin(bot, db, config, winston, member, ch).catch(err => {
					winston.error(err);
				});
			}
		});

		// User voice connection details updated on server (muted, deafened, etc.)
		bot.on("voiceStateUpdate", (member, oldvoice) => {
			if (bot.isReady) {
				eventHandlers.voiceStateUpdate(bot, db, config, winston, member, oldvoice).catch(err => {
					winston.error(err);
				});
			}
		});

		// User left server voice channel
		bot.on("voiceChannelLeave", (member, ch) => {
			if (bot.isReady) {
				eventHandlers.voiceChannelLeave(bot, db, config, winston, member, ch).catch(err => {
					winston.error(err);
				});
			}
		});

		process.on("uncaughtException", async err => {
			const hastelink = await hastebin(err.replace(new RegExp(`${bot.token}|${require("./../../Configuration/auth.json").platform.login_token}`, "g"), "(╯°□°）╯︵ ┻━┻"));
			if (bot.isReady) {
				if (config.discordInfoGuild && config.discordInfoChannel) {
					try {
						await bot.guilds.get(config.discordInfoGuild).channels.get(config.discordInfoChannel).createMessage({
							embed: {
								author: {
									name: "Oh no, this is bad..!",
								},
								color: 0xFF0000,
								title: "Uncaught Exception, please alert us about this ASAP.",
								description: `Click [here](${hastelink}) to see the Hastebin URL`,
								footer: {
									text: `Unless you know what you're doing, I'd recommend sending this Hastebin URL to the GitHub page!`,
								},
							},
						});
					} catch (discordErr) {
						winston.error(`Couldn't find Channel / Guild combo, so I'll place the Hastebin URL here`, { hastebin_url: hastelink });
					}
				} else {
					winston.error("There wasn't any guild to output the uncaughtException, placing link in here.", { hastebin_url: hastelink });
				}
			} else {
				winston.error(`The bot isn't ready yet, but there was an unhandled Promise Rejection`, { hastebin: hastelink });
			}
		});

		process.on("unhandledRejection", async (reason, p) => {
			p = util.inspect(p, false, 2);
			const hastelink = await hastebin(`Reason: ${reason}\n${p.replace(new RegExp(`${bot.token}|${require("./../../Configuration/auth.json").platform.login_token}`, "g"), "(╯°□°）╯︵ ┻━┻")}`);
			if (bot.isReady) {
				if (config.discordInfoGuild && config.discordInfoChannel) {
					try {
						await bot.guilds.get(config.discordInfoGuild).channels.get(config.discordInfoChannel).createMessage({
							embed: {
								color: 0xFF0000,
								author: {
									name: "Oh no, this is bad..!",
								},
								title: `Uncaught Promise Rejection, you should report this..`,
								description: `Click [here](${hastelink}) to see the Hastebin URL`,
								footer: {
									text: `Unless you know what you're doing, I'd recommend sending this Hastebin URL to the GitHub page!`,
								},
							},
						});
					} catch (err) {
						winston.error(`Couldn't find Channel / Guild combo, so I'll place the Hastebin URL here`, { hastebin_url: hastelink });
					}
				} else {
					winston.error("There wasn't any guild to output the unhandledRejection, placing link in here.", { hastebin_url: hastelink });
				}
			} else {
				winston.error(`The bot isn't ready yet, but there was an unhandled Promise Rejection`, { hastebin: hastelink });
			}
		});
	}
});
