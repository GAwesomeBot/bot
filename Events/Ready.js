/* eslint-disable max-len */
const BaseEvent = require("./BaseEvent.js");
const {
	NewServer: getNewServerData,
	PostData,
	Utils,
} = require("../Modules/");
const {
	ClearServerStats: clearStats,
	Giveaways,
	MessageOfTheDay: createMessageOfTheDay,
	SetCountdown: setCountdown,
	SetReminder: setReminder,
	StreamChecker: sendStreamerMessage,
	StreamingRSS: sendStreamingRSSUpdates,
} = Utils;
/**
 * Ready Event Handler
 */
class Ready extends BaseEvent {
	async handle () {
		try {
			this.ensureDocuments().then(async newServerDocuments => {
				if (newServerDocuments && newServerDocuments.length > 0) {
					winston.info(`Created documents for ${newServerDocuments.length} new servers!`);
					this.db.servers.insertMany(newServerDocuments).catch(err => {
						winston.warn(`Failed to insert new server documents..`, err);
					}).then(async () => {
						winston.info(`Successfully inserted ${newServerDocuments.length} new server documents into the database! \\o/`);
						await this.pruneServerData();
					});
				} else {
					await this.pruneServerData();
				}
			});
		} catch (err) {
			await this.pruneServerData();
		}
	}
	// Ensure that all servers have database documents
	async ensureDocuments () {
		winston.debug("Ensuring all guilds have a serverDocument.");
		let newServerDocuments = [];
		const makeNewDocument = async guild => {
			const serverDocument = await this.db.servers.findOne({ _id: guild.id }).exec().catch(err => {
				winston.verbose(`Failed to find server data.. Sorry!`, err);
			});
			if (serverDocument) {
				const channelIDs = guild.channels.map(a => a.id);
				for (let j = 0; j < serverDocument.channels.length; j++) {
					if (!channelIDs.includes(serverDocument.channels[j]._id)) {
						serverDocument.channels[j].remove();
					}
				}
			} else {
				newServerDocuments.push(await getNewServerData(this.bot, guild, new this.db.servers({ _id: guild.id })));
			}
		};
		let promiseArray = [];
		this.bot.guilds.forEach(guild => promiseArray.push(makeNewDocument(guild)));
		await Promise.all(promiseArray);
		return newServerDocuments;
	}

	// Delete data for old servers
	async pruneServerData () {
		winston.debug(`Deleting data for old servers...`);
		this.db.servers.find({
			_id: {
				$nin: await Utils.GetValue(this.bot, "guilds.keys()", "arr", "Array.from"),
			},
		}).remove()
			.exec()
			.catch(err => winston.warn(`Failed to prune old server documents -_-`, err))
			.then(() => winston.debug(`Purged all serverDocuments that the bot doesn't know about anymore!`));
		await this.setBotGame();
	}

	// Set bot's "now playing" game
	async setBotGame () {
		winston.debug("Setting bots playing game.");
		let gameObject = {
			name: this.configJSON.game.name,
			url: this.configJSON.game.twitchURL,
		};
		if (this.configJSON.game.name === "default") {
			gameObject = {
				name: "https://gawesomebot.com",
				url: "",
			};
		}
		this.bot.user.setPresence({
			game: gameObject,
			status: this.configJSON.status,
		});
		await this.startMessageCount();
	}

	/*
	 * Set messages_today to 0 for all servers
	 * And starts a chain of events cause why not?!
	 */
	async startMessageCount () {
		winston.debug("Creating messages_today timers.");
		await this.db.servers.update({}, { messages_today: 0 }, { multi: true }).exec().catch(err => {
			winston.warn(`Failed to start message counter.. >->`, err);
		});
		const clearMessageCount = () => {
			this.db.servers.update({}, { messages_today: 0 }, { multi: true }).exec();
		};
		setInterval(clearMessageCount, 86400000);
		// TODO: Add to array this.startTimerExtensions()
		await Promise.all([this.statsCollector(), this.setReminders(), this.setCountdowns(), this.setGiveaways(), this.startStreamingRSS(), this.checkStreamers(), this.startMessageOfTheDay(), this.sendGuilds()]);
		await winston.debug("Posting stats data to Discord Bot listings.");
		PostData(this.bot);
		this.showStartupMessage();
	}

	// Send over guild cache for master
	async sendGuilds () {
		try {
			winston.debug("Sending list of guild IDs to Master.");
			let guilds = Array.from(this.bot.guilds.keys());
			this.bot.IPC.send("guilds", { latest: guilds });
		} catch (err) {
			throw err;
		}
	}

	// Report to master that we're ok to go
	showStartupMessage () {
		const readyMsgs = [
			"rock and roll!",
			"PWN some n00bs.",
			"cause trouble!",
			"make it double!",
			"party like you've never boogied before.",
			"rave in the UK.",
			"explore the depths of Discord.",
			"slide into many DM's.",
			"have a wonderful time.",
			"endure the wrath of Auttaja. >.>",
			"do something, I guess.",
			"come up with new loading lines.",
			"generate lots of fun and excitement!",
			"make insane amounts of cold hard cash.",
			"hack into the pentagon a couple of times.",
			"activate mutually assured destruction sequences.",
			"impress everyone with these crazy abs.",
			"go faster than any Sonic has gone before.",
			"be intrepid, and explode.",
			"destroy all humans, in fashion.",
			"go to war!",
			"generate the spiciest of memes.",
			"fulfill life's purpose.",
			"come at you, bro.",
			"be better than Auttaja in every way.",
			"help people out!",
		];
		winston.info(`Hey boss, we're ready to ${readyMsgs[Math.floor(Math.random() * readyMsgs.length)]}`);
		this.bot.isReady = true;
		this.bot.IPC.send("finished", { id: this.bot.shard.id });
	}

	/**
	 * Start message of the day timer, this time with less bork.
	 */
	async startMessageOfTheDay () {
		const serverDocuments = await this.db.servers.find({
			"config.message_of_the_day.isEnabled": true,
		}).exec().catch(err => {
			winston.warn(`Failed to find server data for message of the day <.<\n`, err);
		});
		winston.debug("Starting MOTD timers for servers.");
		if (serverDocuments) {
			const promiseArray = [];
			for (let i = 0; i < serverDocuments.length; i++) {
				const server = this.bot.guilds.get(serverDocuments[i]._id);
				if (server) {
					winston.verbose(`Starting MOTD timer for server ${server}`, { svrid: server.id });
					promiseArray.push(createMessageOfTheDay(this.bot, this.db, server, serverDocuments[i].config.message_of_the_day));
				}
			}
			await Promise.all(promiseArray);
		}
	}

	/**
	 * Periodically check if people are streaming
	 * Totally not stalking 👀 - Vlad
	 */
	async checkStreamers () {
		const serverDocuments = await this.db.servers.find({}).exec().catch(err => {
			winston.warn(`Failed to get server documents for streamers (-_-*)`, err);
		});
		winston.debug("Checking for streamers in servers.");
		if (serverDocuments) {
			const checkStreamersForServer = async i => {
				if (i < serverDocuments.length) {
					const serverDocument = serverDocuments[i];
					const server = this.bot.guilds.get(serverDocument._id);
					if (server) {
						winston.verbose(`Checking for streamers in server ${server}`, { svrid: server.id });
						const checkIfStreaming = async j => {
							if (j < serverDocument.config.streamers_data.length) {
								sendStreamerMessage(server, serverDocument, serverDocument.config.streamers_data[j]).then(async () => {
									await checkIfStreaming(++j);
								}).catch(err => {
									winston.debug(`Failed to send streaming message to server ;.;\n`, err);
								});
							} else {
								await checkStreamersForServer(++i);
							}
						};
						await checkIfStreaming(0);
					}
				} else {
					setTimeout(async () => {
						await this.checkStreamers();
					}, 600000);
				}
			};
			await checkStreamersForServer(0);
		}
	}

	/**
	 * Start RSS streaming timers
	 */
	async startStreamingRSS () {
		const serverDocuments = await this.db.servers.find({}).exec().catch(err => {
			winston.warn(`Failed to get servers from db (-_-*)`, err);
		});
		winston.debug("Starting streaming RSS timers for servers.");
		if (serverDocuments) {
			const sendStreamingRSSToServer = async i => {
				if (i < serverDocuments.length) {
					const serverDocument = serverDocuments[i];
					const server = this.bot.guilds.get(serverDocument._id);
					if (server) {
						winston.verbose(`Setting streaming RSS timers for server ${server}`, { svrid: server.id });
						const sendStreamingRSSFeed = async j => {
							if (j < serverDocument.config.rss_feeds.length) {
								if (serverDocument.config.rss_feeds[j].streaming.isEnabled) {
									sendStreamingRSSUpdates(this.bot, server, serverDocument, serverDocument.config.rss_feeds[j]).then(async () => {
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
						await this.startStreamingRSS();
					}, 600000);
				}
			};
			await sendStreamingRSSToServer(0);
		}
	}

	/**
	 * Set existing giveaways to end when they expire
	 */
	async setGiveaways () {
		const promiseArray = [];
		const serverDocuments = await this.db.servers.find({
			channels: {
				$elemMatch: {
					"giveaway.isOngoing": true,
				},
			},
		}).exec().catch(err => {
			winston.warn("Failed to get giveaways from db (-_-*)", err);
		});
		winston.debug("Setting existing giveaways for servers.");
		if (serverDocuments) {
			serverDocuments.forEach(serverDocument => {
				const svr = this.bot.guilds.get(serverDocument._id);
				if (svr) {
					winston.verbose(`Setting existing giveaways for server ${svr.id}.`, { svrid: svr.id });
					serverDocument.channels.forEach(channelDocument => {
						if (channelDocument.giveaway.isOngoing) {
							const ch = svr.channels.get(channelDocument._id);
							if (ch) {
								promiseArray.push(Giveaways.endTimedGiveaway(this.bot, this.db, svr, ch, channelDocument.giveaway.expiry_timestamp));
							}
						}
					});
				}
			});
		}
		await Promise.all(promiseArray);
	}

	/**
	 * Set existing countdowns in servers to send message when they expire
	 */
	async setCountdowns () {
		const promiseArray = [];
		const serverDocuments = await this.db.servers.find({ "config.countdown_data": { $not: { $size: 0 } } }).exec().catch(err => {
			winston.warn("Failed to get countdowns from db (-_-*)", err);
		});
		winston.debug("Setting existing countdowns in servers.");
		if (serverDocuments) {
			for (let i = 0; i < serverDocuments.length; i++) {
				winston.verbose(`Setting existing countdowns for server.`, { svrid: serverDocuments[i]._id });
				for (let j = 0; j < serverDocuments[i].config.countdown_data.length; j++) {
					promiseArray.push(setCountdown(this.bot, serverDocuments[i], serverDocuments[i].config.countdown_data[j]));
				}
			}
		}
		await Promise.all(promiseArray);
	}

	/**
	 * Set existing reminders to send message when they expire
	 */
	async setReminders () {
		const promiseArray = [];
		const userDocuments = await this.db.users.find({ reminders: { $not: { $size: 0 } } }).exec().catch(err => {
			winston.warn(`Failed to get reminders from db (-_-*)`, err);
		});
		winston.debug("Setting existing reminders for all users.");
		if (userDocuments) {
			for (let i = 0; i < userDocuments.length; i++) {
				winston.verbose("Setting existing reminders for user.", { usrid: userDocuments[i]._id });
				for (let j = 0; j < userDocuments[i].reminders.length; j++) {
					promiseArray.push(setReminder(this.bot, userDocuments[i], userDocuments[i].reminders[j]));
				}
			}
		}
		await Promise.all(promiseArray);
	}

	/**
	 * Count a server's stats (games, clearing, etc.);
	 */
	async statsCollector () {
		winston.debug("Collecting stats for servers.");
		const promiseArray = [];
		const countServerStats = async server => {
			const serverDocument = await this.db.servers.findOne({ _id: server.id }).exec().catch(err => {
				winston.warn(`Failed to find server document for counting stats >.<`, { svrid: server.id }, err);
			});
			winston.verbose(`Collecting stats for server ${server}.`, { svrid: server.id });
			if (serverDocument) {
				// Clear stats for server if older than a week
				if (Date.now() - serverDocument.stats_timestamp >= 604800000) {
					await clearStats(this.bot, this.db, server, serverDocument);
				} else {
					// Iterate through all members
					server.members.forEach(async member => {
						if (member.id !== this.bot.user.id && !member.user.bot) {
							await winston.verbose(`Collecting member stats from guild ${server} member ${member.user.tag}.`, { svrid: server.id, memberid: member.user.id });
							const game = await this.bot.getGame(member);
							if (game !== "" && member.presence.status === "online") {
								await winston.verbose(`Updating game data for ${member.user.tag}.`, { svrid: server.id, memberid: member.user.id });
								let gameDocument = serverDocument.games.id(game);
								if (!gameDocument) {
									serverDocument.games.push({ _id: game });
									gameDocument = serverDocument.games.id(game);
								}
								gameDocument.time_played++;
							}

							// Kick member if they're inactive and autokick is on
							const memberDocument = serverDocument.members.id(member.id);
							if (memberDocument && serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.autokick_members.isEnabled && Date.now() - memberDocument.last_active > serverDocument.config.moderation.autokick_members.max_inactivity && !memberDocument.cannotAutokick && this.bot.getUserBotAdmin(server, serverDocument, member) === 0) {
								try {
									await member.kick(`Kicked for inactivity on server.`);
									winston.verbose(`Kicked member "${member.user.tag}" due to inactivity on server "${server}"`, { svrid: server.id, usrid: member.user.id });
								} catch (err) {
									memberDocument.cannotAutokick = true;
									winston.debug(`Failed to kick member "${member.user.tag}" due to inactivity on server "${server}"`, { svrid: server.id, usrid: member.user.id }, err);
								}
							}
						}
					});
					try {
						await serverDocument.save();
					} catch (err) {
						winston.warn(`Failed to save server data for stats.. <.>`, { svrid: server.id }, err);
					}
				}
			}
		};
		this.bot.guilds.forEach(guild => {
			promiseArray.push(countServerStats(guild));
		});
		await Promise.all(promiseArray);
	}

	// TODO: async runTimerExtensions
}

module.exports = Ready;
