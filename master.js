/* eslint-disable max-len */
const ascii = `
  _____                                               ____        _
 / ____|   /\\                                        |  _ \\      | |
| |  __   /  \\__      _____  ___  ___  _ __ ___   ___| |_) | ___ | |_
| | |_ | / /\\ \\ \\ /\\ / / _ \\/ __|/ _ \\| '_ \` _ \\ / _ \\  _ < / _ \\| __|
| |__| |/ ____ \\ V  V /  __/\\__ \\ (_) | | | | | |  __/ |_) | (_) | |_
 \\_____/_/    \\_\\_/\\_/ \\___||___/\\___/|_| |_| |_|\\___|____/ \\___/ \\__|
			`;

const { Traffic, Updater } = require("./Modules");
const { Boot, Sharder } = require("./Internals");
const { Stopwatch } = require("./Modules/Utils");

const database = require("./Database/Driver.js");
const auth = require("./Configurations/auth.js");
const configJS = require("./Configurations/config.js");
const configJSON	= require("./Configurations/config.json");
const configWarnings = [];

const scope = { safeMode: false };

Boot({ configJS, configJSON, auth }, scope).then(() => {
	if (scope.migrating) return;
	winston.debug("Connecting to MongoDB... ~(˘▾˘~)", { URL: configJS.database.URL, db: configJS.database.db });

	// eslint-disable-next-line promise/catch-or-return
	database.initialize(configJS.database).catch(err => {
		winston.error(`An error occurred while connecting to MongoDB! x( Is the database online?\n`, err);
		process.exit(1);
	}).then(async () => {
		const db = database.getConnection();

		if (db && !scope.safeMode) {
			await winston.info(`Connected to the database successfully.`);

			winston.silly("Confirming MongoDB config values.");
			await db.client.admin().command({ getCmdLineOpts: 1 }).then(res => {
				if (!res.parsed || !res.parsed.net || !res.parsed.net.bindIp) {
					winston.warn("Your MongoDB instance appears to be opened to the wild, wild web. Please make sure authorization is enforced!");
					configWarnings.push("Your MongoDB instance can be accessed from everywhere, make sure authorization is configured.");
				}
			});

			winston.silly("Confirming auth.js config values.");
			if (Object.values(auth.tokens).some(token => token === "")) {
				winston.warn("You haven't supplied some auth tokens, make sure to fill in auth.js to make sure all GAB features function!");
				configWarnings.push("In auth.js, some values have not been filled in correctly. Some commands may not function as expected.");
			}

			winston.silly("Confirming config.js config values.");
			if (!configJS.hostingURL || !configJS.oauthLink || (typeof configJS.hostingURL || typeof configJS.oauthLink) !== "string") {
				winston.warn("Some config.js values have not been configured correctly. GAB may be harder to reach by users.");
				configWarnings.push("The config.js values hostingURL and/or oauthLink are malformed or empty.");
			}
			if (!configJS.secret || !configJS.serverIP || (typeof configJS.secret || typeof configJS.serverIP) !== "string" || !configJS.httpPort || !configJS.httpsPort) {
				winston.warn("Some config.js values have not been configured correclty. GAB's Web Interface may not work as intended.");
				configWarnings.push("The config.js values secret, serverIP, httpPort and/or httpsPort are malformed or empty.");
			}
			if (configJS.secret === "vFEvmrQl811q2E8CZelg4438l9YFwAYd") {
				winston.warn("Your session secret value appears to be default. Please note that this value is public!");
				configWarnings.push("Your config.js secret value has not been reconfigured. This value is public!");
			}
			if ((configJS.httpPort !== "80" || configJS.httpsPort !== "443") && !process.argv.includes("-p") && !process.argv.includes("--proxy")) {
				winston.warn("You are running GAwesomeBot on a non-standard port, if a reverse-proxy such as Nginx is being used, restart GAwesomeBot with the '--proxy' argument.");
			}

			winston.silly("Confirming config.json values.");
			if (await Updater.check(configJSON) === 404) {
				winston.warn(`GAB version ${configJSON.version} was not found on branch ${configJSON.branch}, you may need to reinstall GAB for the Updater to be enabled again.`);
				configWarnings.push(`GAwesomeBot ${configJSON.version} is not a valid version on branch ${configJSON.branch}. The Updater has been disabled to avoid update conflicts.`);
			}

			winston.silly("Confirming environment setup.");
			if (process.env.NODE_ENV !== "production") {
				winston.warn("GAB is running in development mode, this might impact web interface performance. In order to run GAB in production mode, please set the NODE_ENV environment var to production.");
				configWarnings.push("GAwesomeBot is running in development mode. Set the NODE_ENV environment variable to 'production' to dismiss this warning.");
			}

			winston.silly("Confirming clientToken config value.");
			if (!auth.discord.clientToken && !process.argv.includes("--build")) {
				winston.error("You must provide a clientToken in \"Configurations/auth.js\" to open the gates to Discord! -.-");
				process.exit(1);
			}

			winston.silly("Confirming shardTotal config value.");
			if (!parseInt(configJS.shardTotal) && configJS.shardTotal !== "auto") {
				winston.error(`You must enter your shardTotal config value as a valid number, or "auto".`);
				process.exit(1);
			}

			if (configJS.shardTotal !== "auto" && configJS.shardTotal < 1) {
				winston.error(`In config.js, shardTotal must be greater than or equal to 1`);
				process.exit(1);
			}

			if (configJS.shardTotal === "auto") {
				winston.info(`Getting the recommended shards from Discord..`);
				const result = await require("discord.js").Util.fetchRecommendedShards(auth.discord.clientToken);
				winston.info(`GAwesomeBot will spawn ${result} shard(s) as recommended by Discord.`, { shards: result });
				configJS.shardTotal = result;
			}
		}

		winston.verbose("Creating sharder instance.");
		const sharder = await new Sharder(auth.discord.clientToken, configJS.shardTotal, winston);
		sharder.cluster.on("online", worker => {
			winston.info(`Worker ${worker.id} launched.`, { worker: worker.id });
		});

		if (!scope.safeMode) {
			sharder.traffic = new Traffic(sharder.IPC, false);

			// Sharder events
			sharder.ready = 0;
			sharder.finished = 0;
			sharder.IPC.on("ready", async () => {
				sharder.ready++;
				if (sharder.ready === sharder.count) {
					winston.info("All shards connected.");
				}
			});

			const shardFinished = () => {
				if (sharder.finished > -1) sharder.finished++;
				if (sharder.finished === sharder.count) {
					// Print startup ascii message
					winston.info(`The best Discord Bot, version ${configJSON.version}, is now ready!`);
					// Use console.log because winston never lets us have anything fun, MOM
					// eslint-disable-next-line no-console
					console.log(ascii);
					sharder.finished = -1;
					sharder.IPC.send("postAllData", {}, 0);
					if (process.argv.includes("--build")) {
						winston.warn("Shutting down travis build with code 0");
						sharder.cluster.disconnect();
						process.exit(0);
					}
				}
			};

			// Shard has finished all work
			sharder.IPC.on("finished", shardFinished);

			// Shard requests guild data
			sharder.IPC.on("getGuild", async (msg, callback) => {
				try {
					if (msg.target !== "*") {
						const shardId = sharder.IPC.shard(msg.target);
						if (!shardId && shardId !== 0) return callback({ target: msg.target, err: 404, result: null });

						const result = await sharder.shards.get(shardId).getGuild(msg.target, msg.settings);
						return callback({ target: msg.target, err: null, result });
					} else {
						const promises = [];
						sharder.shards.forEach(async shard => {
							promises.push(shard.getGuilds(msg.settings));
						});

						const result = await Promise.all(promises);
						const isArr = msg.settings.parse === "noKeys";
						return callback({
							target: msg.target,
							err: null,
							result: result.reduce((prev, value) => isArr ? prev.concat(value) : Object.assign(prev, value), isArr ? [] : {}),
						});
					}
				} catch (err) {
					winston.warn("An error occurred while fetching internal guild data l.l\n", err);
					return callback({ target: msg.target, err: err, result: null });
				}
			});

			// Shard has modified Console data
			sharder.IPC.on("dashboardUpdate", async msg => {
				winston.silly(`Broadcasting update to dashboard at ${msg.location}.`);
				sharder.IPC.send("dashboardUpdate", { namespace: msg.namespace, location: msg.location, author: msg.author }, "*");
			});

			// Shard requests a user to be muted
			sharder.IPC.forward("muteMember");

			// Shard requests a user to be unmuted
			sharder.IPC.forward("unmuteMember");

			// Shard requests a new Message Of The Day to be created
			sharder.IPC.forward("createMOTD");

			// Shard requests bot stats to be posted
			sharder.IPC.on("sendAllGuilds", () => sharder.IPC.send("postAllData", {}, 0));

			// Shard requests a guild's public Invite Link to be created/destroyed
			sharder.IPC.forward("createPublicInviteLink");
			sharder.IPC.forward("deletePublicInviteLink");

			// Shard requests JavaScript code to be executed
			sharder.IPC.on("eval", async (msg, callback) => {
				const promises = [];
				sharder.shards.forEach(shard => promises.push(shard.eval(msg)));
				callback(await Promise.all(promises));
			});

			// Shard requests JavaScript code to be executed and return values to be readable by humans
			sharder.IPC.on("evaluate", async (msg, callback) => {
				if (msg.target === "master") {
					const result = {};
					try {
						result.result = await eval(`(async () => {${msg.code}})()`);
					} catch (err) {
						result.err = true;
						result.result = err;
					}
					if (typeof result.result !== "string") result.result = require("util").inspect(result.result, false, 1);
					return callback(result);
				} else if (sharder.shards.has(Number(msg.target)) || msg.target === "all") {
					sharder.IPC.send("evaluate", `(async () => {${msg.code}})()`, msg.target === "all" ? "*" : Number(msg.target)).then(res => {
						const result = {};
						if (msg.target !== "all") result.result = res.result;
						else result.result = res.map(m => m.result);
						if (msg.target !== "all" && res.err) result.err = true;
						else if (msg.target === "all" && res.some(m => m.err)) result.err = true;
						callback(result);
					}).catch(() => callback(null));
				} else {
					return callback(null);
				}
			});

			// Shard requests leaving a guild
			sharder.IPC.forward("leaveGuild", "this");

			// Shard requests a message to be sent to a guild
			sharder.IPC.on("sendMessage", async msg => {
				if (msg.guild === "*") return sharder.IPC.send("sendMessage", msg, "*");
				const shardid = sharder.IPC.shard(msg.guild);
				if (sharder.shards.has(shardid)) sharder.IPC.send("sendMessage", msg, shardid);
			});

			// Shard requests the bot user to be updated
			sharder.IPC.on("updateBotUser", async msg => sharder.IPC.send("updateBotUser", msg, "*"));

			// Shard requests data about all shards
			sharder.IPC.on("shardData", async (msg, callback) => {
				const data = {};
				data.master = {};
				data.master.rss = Math.floor((process.memoryUsage().rss / 1024) / 1024);
				data.master.uptime = Math.round(((process.uptime() / 60) / 60) * 10) / 10;
				data.master.warns = configWarnings;
				data.master.platform = process.platform;
				switch (data.master.platform) {
					case "win32":
						data.master.platform = "Windows";
						data.master.platformIcon = "windows";
						break;
					case "darwin":
						data.master.platform = "MacOS";
						data.master.platformIcon = "apple";
						break;
					case "linux":
						data.master.platform = "Linux";
						data.master.platformIcon = "linux";
						break;
					default:
						data.master.platform = `An Unknown Operating System (${process.platform})`;
						data.master.platformIcon = "question";
						break;
				}
				data.master.PID = process.pid;
				const timer = new Stopwatch();
				data.master.guilds = await db.servers.count();
				const afterQuery = timer.friendlyDuration;
				timer.stop();
				data.master.ping = afterQuery;
				data.master.users = await db.users.count();
				if (!msg.noShards) data.shards = await Promise.all(sharder.shards.map(shard => sharder.IPC.send("shardData", {}, shard.id)));
				callback(data);
			});

			sharder.IPC.on("dismissWarning", (msg, callback) => {
				const index = configWarnings.indexOf(msg.warning);
				if (index > -1) configWarnings.splice(index, 1);
				callback();
			});

			sharder.IPC.on("freezeShard", async (msg, callback) => {
				if (sharder.shards.has(Number(msg.shard))) await sharder.IPC.send("freeze", {}, Number(msg.shard));
				callback();
			});

			sharder.IPC.on("restartShard", async (msg, callback) => {
				if (sharder.shards.has(Number(msg.shard))) await sharder.IPC.send("restart", { soft: msg.soft }, Number(msg.shard));
				callback();
			});

			sharder.IPC.forward("modifyActivity");

			sharder.IPC.on("relay", async (msg, reply) => {
				const findResults = await sharder.IPC.send("relay", {
					command: msg.command,
					params: msg.findParams,
					action: "find",
				}, "*");

				if (findResults.every(result => result === false)) return reply("none");
				if (findResults.filter(result => result !== false).length !== 1) return reply("multi");
				reply(true);

				if (!msg.execParams) msg.execParams = {};
				const guildID = findResults.find(result => result !== false);
				const shardID = sharder.IPC.shard(guildID);
				msg.execParams.guildid = guildID;

				sharder.IPC.send("relay", { command: msg.command, params: msg.execParams, action: "run" }, shardID);
			});

			sharder.IPC.on("awaitMessage", async (msg, callback) => callback(await sharder.IPC.send("awaitMessage", msg, 0)));

			// Shard requests all shards to be marked Unavailable
			sharder.IPC.on("updating", (msg, callback) => sharder.IPC.send("updating", msg, "*").then(callback));

			// Shard requests GAB to shutdown
			sharder.IPC.on("shutdown", async msg => {
				if (msg.soft) {
					if (msg.err) winston.error(`A critical error occurred within a worker, all workers must restart.`);
					else winston.info(`All workers are being restarted. Expect some lag!`);
					sharder.shards.forEach(shard => shard.worker.kill());
				} else {
					if (msg.err) winston.error(`A critical error occurred within a worker, the master can no longer operate; GAB is shutting down.`);
					else winston.info(`GAB is shutting down.`);
					sharder.shutdown = true;
					sharder.cluster.disconnect();
					process.exit(msg.err ? 1 : 0);
				}
			});
		}

		sharder.spawn();
	});

	process.on("uncaughtException", err => {
		winston.error("An unknown and unexpected error occurred, and we failed to handle it. Sorry! x.x\n", err);
		process.exit(1);
	});

	process.on("unhandledRejection", err => {
		winston.error("An unknown and unexpected error occurred, and we failed to handle it. Sorry! x.x\n", err);
		process.exit(1);
	});
}).catch(err => {
	throw err;
});
