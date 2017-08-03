const auth = require("../Configurations/auth.js");
// const getNewServerData = require("../Modules/NewServer.js");
// const setReminder = require("../Modules/SetReminder.js");
// const setCountdown = require("../Modules/SetCountdown.js");
// const sendStreamerMessage = require("../Modules/StreamChecker.js");
// const createMessageOfTheDay = require("../Modules/MessageOfTheDay.js");
// const runTimerExtension = require("../Modules/TimerExtensionRunner.js");
// const postData = require("../Modules/PostData.js");
const { Utils } = require("../Modules/");
const {
	ClearServerStats: clearStats,
	Giveaways,
	MessageOfTheDay: createMessageOfTheDay,
	SetCountdown: setCountdown,
	SetReminder: setReminder,
	StreamChecker: sendStreamerMessage,
	StreamingRSS: sendStreamingRSSUpdates,
} = Utils;

/* eslint-disable max-len */
module.exports = async (bot, db, configJS, configJSON) => {
	// Count a server's stats (games, clearing, etc.);
	const statsCollector = async () => {
		const promiseArray = [];
		const countServerStats = async server => {
			const serverDocument = await db.servers.findOne({ _id: server.id }).catch(err => {
				winston.warn(`Failed to find a server document for counting stats`, { svrid: server.id }, err);
			});
			if (serverDocument) {
				// Clear stats for server if older than a week
				if (Date.now() - serverDocument.stats_timestamp >= 604800000) {
					await clearStats(bot, db, server, serverDocument);
				} else {
					// Iterate through all members
					server.members.forEach(async member => {
						if (member.id !== bot.user.id && !member.user.bot) {
							const game = await bot.getGame(member);
							if (game !== "" && member.presence.status === "online") {
								let gameDocument = serverDocument.games.id(game);
								if (!gameDocument) {
									serverDocument.games.push({ _id: game });
									gameDocument = serverDocument.games.id(game);
								}
								gameDocument.time_played++;
							}

							// Kick member if they're inactive and autokick is on
							const memberDocument = serverDocument.members.id(member.id);
							if (memberDocument && serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.autokick_members.isEnabled && Date.now() - memberDocument.last_active > serverDocument.config.moderation.autokick_members.max_inactivity && !memberDocument.cannotAutokick && bot.getUserBotAdmin(server, serverDocument, member) === 0) {
								try {
									await member.kick(`Kicked for inactivity on the server.`);
									winston.info(`Kicked member "${member.user.tag}" due to inactivity on server "${server}"`, { svrid: server.id, usrid: member.id });
								} catch (err) {
									memberDocument.cannotAutokick = true;
									winston.warn(`Failed to kick member "${member.user.tag}" due to inactivity on server "${server}"`, { svrid: server.id, usrid: member.id }, err);
								}
							}
						}
					});
					try {
						await serverDocument.save();
					} catch (err) {
						winston.warn(`Failed to save server data for stats..`, { svrid: server.id }, err);
					}
				}
			}
		};
		bot.guilds.forEach(guild => {
			promiseArray.push(countServerStats(guild));
		});
		await Promise.all(promiseArray);
	};

	// Set existing reminders to send message when they expire
	const setReminders = async () => {
		const promiseArray = [];
		const userDocuments = await db.users.find({ reminders: { $not: { $size: 0 } } }).catch(err => {
			winston.warn(`Failed to get reminders`, err);
		});
		if (userDocuments) {
			for (let i = 0; i < userDocuments.length; i++) {
				for (let j = 0; j < userDocuments[i].reminders.length; j++) {
					promiseArray.push(setReminder(bot, userDocuments[i], userDocuments[i].reminders[j]));
				}
			}
		}
		await Promise.all(promiseArray);
	};

	// Set existing countdowns in servers to send message when they expire
	const setCountdowns = async () => {
		const promiseArray = [];
		const serverDocuments = await db.servers.find({ "config.countdown_data": { $not: { $size: 0 } } }).catch(err => {
			winston.warn("Failed to get countdowns", err);
		});
		if (serverDocuments) {
			for (let i = 0; i < serverDocuments.length; i++) {
				for (let j = 0; j < serverDocuments[i].config.countdown_data.length; j++) {
					promiseArray.push(setCountdown(bot, serverDocuments[i], serverDocuments[i].config.countdown_data[j]));
				}
			}
		}
		await Promise.all(promiseArray);
	};

	// Set existing giveaways to end when they expire
	const setGiveaways = async () => {
		const promiseArray = [];
		const serverDocuments = await db.servers.find({
			channels: {
				$elemMatch: {
					"giveaway.isOngoing": true,
				},
			},
		}).catch(err => {
			winston.warn("Failed to get giveaways", err);
		});
		if (serverDocuments) {
			serverDocuments.forEach(serverDocument => {
				const svr = bot.guilds.get(serverDocument._id);
				if (svr) {
					serverDocument.channels.forEach(channelDocument => {
						if (channelDocument.giveaway.isOngoing) {
							const ch = svr.channels.get(channelDocument._id);
							if (ch) {
								promiseArray.push(Giveaways.endTimedGiveaway(bot, db, svr, ch, channelDocument.giveaway.expiry_timestamp));
							}
						}
					});
				}
			});
		}
		await Promise.all(promiseArray);
	};

	// Start streaming RSS timer
	const startStreamingRSS = async () => {
		const serverDocuments = await db.servers.find({}).catch(err => {
			winston.warn(`Failed to.. get server documents? O.o`, err);
		});
		if (serverDocuments) {
			const sendStreamingRSSToServer = async i => {
				if (i < serverDocuments.length) {
					const serverDocument = serverDocuments[i];
					const server = bot.guilds.get(serverDocument._id);
					if (server) {
						const sendStreamingRSSFeed = async j => {
							if (j < serverDocument.config.rss_feeds.length) {
								if (serverDocument.config.rss_feeds[j].streaming.isEnabled) {
									sendStreamingRSSUpdates(bot, server, serverDocument, serverDocument.config.rss_feeds[j]).then(async () => {
										await sendStreamingRSSFeed(++j);
									});
								} else {
									await sendStreamingRSSFeed(++j);
								}
							} else {
								await sendStreamingRSSToServer(++i);
							}
						};
						await sendStreamingRSSFeed(0);
					}
				} else {
					setTimeout(async () => {
						await startStreamingRSS();
					}, 600000);
				}
			};
			await sendStreamingRSSToServer(0);
		}
	};

	// Periodically check if people are streaming
	// Totally not stalking 👀 // Vlad
	const checkStreamers = async () => {
		const serverDocuments = await db.servers.find({}).catch(err => {
			winston.warn(`Failed to get server documents for streamers.. ;-;`, err);
		});
		if (serverDocuments) {
			const checkStreamersForServer = async i => {
				if (i < serverDocuments.length) {
					const serverDocument = serverDocuments[i];
					const server = bot.guilds.get(serverDocument._id);
					if (server) {
						const checkIfStreaming = async j => {
							if (j < serverDocument.config.streamers_data.length) {
								sendStreamerMessage(server, serverDocument, serverDocument.config.streamers_data[j]).then(async () => {
									await checkIfStreaming(++j);
								}).catch(err => {
									winston.verbose(`Error whilst searching for streamers, probably wrong data... (╯°□°）╯︵ ┻━┻\n`, err);
								});
							} else {
								await checkStreamersForServer(++i);
							}
						};
						await checkIfStreaming(0);
					}
				} else {
					setTimeout(async () => {
						await checkStreamers();
					}, 600000);
				}
			};
			await checkStreamersForServer(0);
		}
	};

	// Start message of the day timer
	// This time, no more bork, hopefully..
	const startMessageOfTheDay = async () => {
		const serverDocuments = await db.servers.find({
			"config.message_of_the_day.isEnabled": true,
		}).catch(err => {
			winston.warn(`Failed to find server data for message of the day <.<\n`, err);
		});
		if (serverDocuments) {
			const promiseArray = [];
			for (let i = 0; i < serverDocuments.length; i++) {
				const server = bot.guilds.get(serverDocuments[i]._id);
				if (server) {
					promiseArray.push(createMessageOfTheDay(bot, db, server, serverDocuments[i].config.message_of_the_day));
				}
			}
			await Promise.all(promiseArray);
		}
	};

	// Print startup ASCII art in console
	const showStartupMessage = () => {
		bot.isReady = true;
		const ascii = `
		
			 _____                                               ____        _
			/ ____|   /\\                                        |  _ \\      | |
		 | |  __   /  \\__      _____  ___  ___  _ __ ___   ___| |_) | ___ | |_
		 | | |_ | / /\\ \\ \\ /\\ / / _ \\/ __|/ _ \\| '_ \` _ \\ / _ \\  _ < / _ \\| __|
		 | |__| |/ ____ \\ V  V /  __/\\__ \\ (_) | | | | | |  __/ |_) | (_) | |_
			\\_____/_/    \\_\\_/\\_/ \\___||___/\\___/|_| |_| |_|\\___|____/ \\___/ \\__|
		
		`;
		winston.info(`Started the best Discord Bot, version ${configJSON.version}`);
		if (bot.shard.id === 0) {
			// I know I know, console.log, deal with it 😎
			console.log(ascii);
		}
	};
};
