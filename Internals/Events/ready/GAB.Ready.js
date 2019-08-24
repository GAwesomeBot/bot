/* eslint-disable max-len */
const BaseEvent = require("../BaseEvent.js");
const {
	NewServer: getNewServerData,
	PostShardedData,
	Utils,
	Giveaways,
} = require("../../../Modules/");
const {
	ClearServerStats: clearStats,
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
		let leftGuilds = 0;
		if (this.configJSON.guildBlocklist.length) {
			this.configJSON.guildBlocklist.forEach(guildID => {
				const guild = this.client.guilds.get(guildID);
				if (guild) {
					guild.leave();
					leftGuilds++;
				}
			});
		}
		leftGuilds > 0 && logger.info(`Left the blacklisted guilds that added the bot while I was asleep.`, { leftGuilds });
		await this.afterLeaving();
	}

	// Runs after leaving any blocklisted guilds (if any)
	async afterLeaving () {
		try {
			const newServerDocuments = await this.ensureDocuments();
			if (newServerDocuments && newServerDocuments.length > 0) {
				logger.info(`Created documents for ${newServerDocuments.length} new servers!`);
				await Servers.insert(newServerDocuments, { ordered: false }).catch(err => {
					logger.warn(`Failed to insert new server documents...`, {}, err);
				}).then(async () => {
					logger.info(`Successfully inserted ${newServerDocuments.length} new server documents into the database! \\o/`);
					await this.setBotActivity();
				});
			} else {
				await this.setBotActivity();
			}
		} catch (err) {
			await this.setBotActivity();
		}
	}

	// Ensure that all servers have database documents
	async ensureDocuments () {
		logger.debug("Ensuring all guilds have a serverDocument.");
		const newServerDocuments = [];

		const makeNewDocument = async guild => {
			const serverDocument = await Servers.findOne(guild.id).catch(err => {
				logger.debug(`Failed to find server data for server ${guild.id}!`, { svrid: guild.id }, err);
			});
			if (serverDocument) {
				try {
					const channelIDs = [...guild.channels.keys()];
					Object.values(serverDocument.channels).forEach(ch => {
						if (!channelIDs.includes(ch._id)) serverDocument.query.id("channels", ch._id).remove();
					});
				} catch (err) {
					logger.debug(`Failed to ensure channelDocuments for ${guild.id}.`, { svrid: guild.id }, err);
				}
			} else {
				newServerDocuments.push(await getNewServerData(this.client, guild, Servers.new({ _id: guild.id })));
			}
		};

		const promiseArray = [];
		this.client.guilds.forEach(guild => promiseArray.push(makeNewDocument(guild)));
		await Promise.all(promiseArray);
		return newServerDocuments;
	}

	// Delete data for old servers
	async pruneServerData () {
		if (this.client.shardID === "0") {
			logger.debug(`Deleting data for old servers...`);
			Servers.delete({
				_id: {
					$nin: await Utils.GetValue(this.client, "guilds.keys()", "arr", "Array.from"),
				},
			}).then(() => logger.debug(`Purged all serverDocuments that the bot doesn't know about anymore!`))
				.catch(err => logger.warn(`Failed to prune old server documents -_-`, {}, err));
		}
		await this.setBotActivity();
	}

	// Set bot's "now playing" activity
	async setBotActivity () {
		logger.debug("Setting bots playing activity.");
		let activity = {
			name: configJSON.activity.name.format({ shard: this.client.shardID, totalShards: this.client.shard.count }),
			type: configJSON.activity.type,
			url: configJSON.activity.twitchURL || null,
		};
		if (configJSON.activity.name === "default") {
			activity = {
				name: "https://gawesomebot.com | Shard {shard}".format({ shard: this.client.shardID }),
				type: "PLAYING",
				url: null,
			};
		}
		await this.client.user.setPresence({
			activity,
			status: configJSON.status,
		});
		await this.startMessageCount();
	}

	/*
	 * Set messages_today to 0 for all servers
	 * And starts a chain of events cause why not?!
	 */
	async startMessageCount () {
		logger.debug("Creating messages_today timers.");
		if (this.client.shardID === "0") {
			await Servers.update({}, { $set: { messages_today: 0 } }, { multi: true }).catch(err => {
				logger.warn(`Failed to start message counter...`, {}, err);
			});
			const clearMessageCount = () => {
				logger.debug("Good new 24 hours! Clearing message counters.");
				Servers.update({}, { $set: { messages_today: 0 } }, { multi: true }).catch(err => {
					logger.warn(`Failed to reset message counter...`, {}, err);
				});
			};
			this.client.setInterval(clearMessageCount, 86400000);
		}
		// TODO: Add to array this.startTimerExtensions()
		await Promise.all([this.resetVoiceStatsCollector(), this.statsCollector(), this.setReminders(), this.setCountdowns(), this.setGiveaways(), this.startStreamingRSS(), this.checkStreamers(), this.startMessageOfTheDay()]);
		await logger.debug("Posting stats data to Discord Bot listings.");
		await PostShardedData(this.client);
		await logger.debug(`Reloading all commands.`);
		this.client.reloadAllCommands();
		this.showStartupMessage();
	}

	async resetVoiceStatsCollector () {
		if (this.client.shardID === "0") {
			logger.debug("Resetting voice_data for all guilds.");
			await Servers.update({ "voice_data.started_timestamp": { $lt: new Date() } }, { $set: { voice_data: [] } }, { multi: true }).catch(err => {
				logger.warn(`Failed to reset voice_data for all guilds...`, {}, err);
			});
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
		logger.info(`Hey boss, we're ready to ${readyMsgs[Math.floor(Math.random() * readyMsgs.length)]}`);
		this.client.IPC.send("finished", { id: this.client.shard.id });
	}

	/**
	 * Start message of the day timer, this time with less bork.
	 */
	async startMessageOfTheDay () {
		const serverDocuments = await Servers.find({
			_id: {
				$in: Array.from(this.client.guilds.keys()),
			},
			"config.message_of_the_day.isEnabled": true,
		}).exec().catch(err => {
			logger.warn(`Failed to find server data for message of the day <.<`, {}, err);
		});
		logger.debug("Starting MOTD timers for servers.");
		if (serverDocuments) {
			const promiseArray = [];
			for (let i = 0; i < serverDocuments.length; i++) {
				const server = this.client.guilds.get(serverDocuments[i]._id);
				if (server) {
					logger.verbose(`Starting MOTD timer for server ${server}`, { svrid: server.id });
					promiseArray.push(createMessageOfTheDay(this.client, server, serverDocuments[i].config.message_of_the_day, serverDocuments[i].query));
				}
			}
			await Promise.all(promiseArray);
		}
	}

	/**
	 * Periodically check if people are streaming
	 */
	async checkStreamers () {
		logger.debug("Checking for streamers in servers.");
		const serverDocuments = await Servers.find({ "config.streamers_data.0": { $exists: true } }).exec();
		for (const serverDocument of serverDocuments) {
			const guild = this.client.guilds.get(serverDocument._id);
			if (guild) {
				logger.verbose(`Checking for streamers in server ${guild}`, { svrid: guild.id });
				if (serverDocument.config.streamers_data.length) {
					for (const streamerData of serverDocument.config.streamers_data) {
						try {
							await sendStreamerMessage(this.client, guild, serverDocument, streamerData);
						} catch (err) {
							logger.warn(`Failed to send streaming message to server ;.;`, { svrid: guild.id }, err);
						}
					}
				}
			}
		}
		this.client.setTimeout(this.checkStreamers.bind(this), 600000);
	}

	/**
	 * Start RSS streaming timers
	 */
	async startStreamingRSS () {
		const serverDocuments = await Servers.find({
			_id: {
				$in: Array.from(this.client.guilds.keys()),
			},
		}).exec().catch(err => {
			logger.warn(`Failed to get servers from db (-_-*)`, {}, err);
		});
		if (serverDocuments) {
			logger.debug("Starting streaming RSS timers for servers.");
			const sendStreamingRSSToServer = async i => {
				if (i < serverDocuments.length) {
					const serverDocument = serverDocuments[i];
					const server = this.client.guilds.get(serverDocument._id);
					if (server) {
						logger.verbose(`Setting streaming RSS timers for server ${server}.`, { svrid: server.id });
						const sendStreamingRSSFeed = async j => {
							if (j < serverDocument.config.rss_feeds.length) {
								if (serverDocument.config.rss_feeds[j].streaming && serverDocument.config.rss_feeds[j].streaming.isEnabled) {
									await sendStreamingRSSUpdates(this.client, server, serverDocument, serverDocument.config.rss_feeds[j]);
									await sendStreamingRSSFeed(++j);
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
					this.client.setTimeout(async () => {
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
		const serverDocuments = await Servers.find({
			_id: {
				$in: Array.from(this.client.guilds.keys()),
			},
			channels: {
				$elemMatch: {
					"giveaway.isOngoing": true,
				},
			},
		}).exec().catch(err => {
			logger.warn("Failed to get giveaways from db (-_-*)", {}, err);
		});
		if (serverDocuments) {
			logger.debug("Setting existing giveaways for servers.");
			serverDocuments.forEach(serverDocument => {
				const svr = this.client.guilds.get(serverDocument._id);
				if (svr) {
					logger.verbose(`Setting existing giveaways for server ${svr.id}.`, { svrid: svr.id });
					Object.values(serverDocument.channels).forEach(channelDocument => {
						if (channelDocument.giveaway.isOngoing) {
							const ch = svr.channels.get(channelDocument._id);
							if (ch) {
								promiseArray.push(Giveaways.endTimedGiveaway(this.client, svr, ch, channelDocument.giveaway.expiry_timestamp));
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
		const serverDocuments = await Servers.find({
			_id: {
				$in: Array.from(this.client.guilds.keys()),
			},
			"config.countdown_data": {
				$not: {
					$size: 0,
				},
			},
		}).exec().catch(err => {
			logger.warn("Failed to get countdowns from db (-_-*)", {}, err);
		});
		if (serverDocuments) {
			logger.debug("Setting existing countdowns in servers.");
			for (let i = 0; i < serverDocuments.length; i++) {
				logger.verbose(`Setting existing countdowns for server.`, { svrid: serverDocuments[i]._id });
				for (let j = 0; j < serverDocuments[i].config.countdown_data.length; j++) {
					promiseArray.push(setCountdown(this.client, serverDocuments[i], serverDocuments[i].config.countdown_data[j]));
				}
			}
		}
		await Promise.all(promiseArray);
	}

	/**
	 * Set existing reminders to send message when they expire
	 */
	async setReminders () {
		if (this.client.shardID !== "0") return;
		const promiseArray = [];
		const userDocuments = await Users.find({ reminders: { $not: { $size: 0 } } }).exec().catch(err => {
			logger.warn(`Failed to get reminders from db (-_-*)`, {}, err);
		});
		if (userDocuments) {
			logger.debug("Setting existing reminders for all users.");
			for (let i = 0; i < userDocuments.length; i++) {
				logger.silly("Setting existing reminders for user.", { usrid: userDocuments[i]._id });
				for (let j = 0; j < userDocuments[i].reminders.length; j++) {
					promiseArray.push(setReminder(this.client, userDocuments[i], userDocuments[i].reminders[j]));
				}
			}
		}
		await Promise.all(promiseArray);
	}

	/**
	 * Count a server's stats (autokick, clearing, etc.);
	 */
	async statsCollector () {
		logger.debug("Collecting stats for servers.");
		const clearStatsServerDocuments = await Servers.find({ stats_timestamp: { $lt: new Date(Date.now() - 604800000) } }).exec();
		await Promise.all(clearStatsServerDocuments.map(serverDocument => clearStats(this.client, serverDocument)));

		const autokickServerDocuments = await Servers.find({
			"config.moderation.isEnabled": true,
			"config.moderation.autokick_members.isEnabled": true,
		}).exec();
		autokickServerDocuments.forEach(serverDocument => {
			const guild = this.client.guilds.get(serverDocument._id);
			if (!guild) return;
			Object.values(serverDocument.members).forEach(async memberDocument => {
				const member = guild.members.get(memberDocument._id);
				if (memberDocument && member && serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.autokick_members.isEnabled && Date.now() - memberDocument.last_active > serverDocument.config.moderation.autokick_members.max_inactivity && !memberDocument.cannotAutokick && this.client.getUserBotAdmin(guild, serverDocument, member) === 0 && member.kickable) {
					try {
						await member.kick(`Kicked for inactivity on server.`);
						logger.verbose(`Kicked member "${member.user.tag}" due to inactivity on server "${guild}"`, { svrid: guild.id, usrid: member.user.id });
					} catch (err) {
						serverDocument.query.id("members", memberDocument._id).set("cannotAutokick", true);
						serverDocument.save();
						logger.debug(`Failed to kick member "${member.user.tag}" due to inactivity on server "${guild}"`, { svrid: guild.id, usrid: member.user.id }, err);
					}
				}
			});
		});
		this.client.setTimeout(async () => {
			await this.statsCollector();
		}, 900000);
	}

	// TODO: async runTimerExtensions
}

module.exports = Ready;
