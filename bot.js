/* eslint-disable max-len */
const ascii = `
  _____                                               ____        _
 / ____|   /\\                                        |  _ \\      | |
| |  __   /  \\__      _____  ___  ___  _ __ ___   ___| |_) | ___ | |_
| | |_ | / /\\ \\ \\ /\\ / / _ \\/ __|/ _ \\| '_ \` _ \\ / _ \\  _ < / _ \\| __|
| |__| |/ ____ \\ V  V /  __/\\__ \\ (_) | | | | | |  __/ |_) | (_) | |_
 \\_____/_/    \\_\\_/\\_/ \\___||___/\\___/|_| |_| |_|\\___|____/ \\___/ \\__|
			`;

const database = require("./Database/Driver.js");
const auth = require("./Configurations/auth.js");
const configJS = require("./Configurations/config.js");
const configJSON	= require("./Configurations/config.json");
const { Console, Sharder, Traffic } = require("./Modules/");

// Set up a winston instance for the Master Process
global.winston = new Console("master");

winston.info(`Logging to ${require("path").join(process.cwd(), `logs/master-gawesomebot.log`)}.`);

process.setMaxListeners(0);

if (process.argv.includes("--build")) winston.warn("Travis build launched. Process will exit after successfully starting.");

winston.debug("Connecting to MongoDB... ~(˘▾˘~)", { url: configJS.databaseURL });

if (process.argv.indexOf("--db") > -1) {
	configJS.databaseURL = process.argv[process.argv.indexOf("--db") + 1];
}
if (process.argv.indexOf("--token") > -1) {
	auth.discord.clientToken = process.argv[process.argv.indexOf("--token") + 1];
}

database.initialize(configJS.databaseURL).catch(err => {
	winston.error(`An error occurred while connecting to MongoDB! x( Is the database online?\n`, err);
	process.exit(-1);
}).then(async () => {
	const db = database.getConnection();
	if (db) {
		await winston.info(`Connected to the database successfully.`);

		winston.silly("Confirming MongoDB config values.");
		await Raw.db.db("admin").command({ getCmdLineOpts: 1 }).then(res => {
			if (!res.parsed || !res.parsed.net || !res.parsed.net.bindIp) {
				winston.warn("Your MongoDB instance appears to be opened to the wild, wild web. Please make sure authorization is enforced!");
			}
		});

		winston.silly("Confirming clientToken config value.");
		if (!auth.discord.clientToken && !process.argv.includes("--build")) {
			winston.error("You must provide a clientToken in \"Configurations/auth.js\" to open the gates to Discord! -.-");
			return;
		}

		winston.silly("Confirming shardTotal config value.");
		if (configJS.shardTotal !== "auto" && configJS.shardTotal < 1) {
			winston.error(`In config.js, shardTotal must be greater than or equal to 1`);
		}

		if (configJS.shardTotal === "auto") {
			winston.info(`Getting the recommended shards from Discord..`);
			let result = await require("discord.js").Util.fetchRecommendedShards(auth.discord.clientToken);
			winston.info(`Starting the bot with the recommended number of shards from Discord!`, { shards: result });
			configJS.shardTotal = result;
		}

		winston.verbose("Creating sharder instance.");
		const sharder = await new Sharder(auth.discord.clientToken, configJS.shardTotal, winston);
		sharder.cluster.on("online", worker => {
			winston.info(`Worker ${worker.id} launched.`, { worker: worker.id });
		});

		const traffic = new Traffic(sharder.IPC, winston, false, db);
		traffic.init();

		// Sharder events
		sharder.ready = 0;
		sharder.finished = 0;
		sharder.IPC.on("ready", async () => {
			sharder.ready++;
			if (sharder.ready === sharder.count) {
				winston.info("All shards connected.");
			}
		});

		sharder.IPC.once("warnDefaultSecret", () => {
			winston.warn("Your session secret value appears to be default. Please note that this value is public!");
		});

		sharder.IPC.once("warnNotProduction", () => {
			winston.warn("GAB is running in development mode, this might impact web interface performance. In order to run GAB in production mode, please set the NODE_ENV environment var to production.");
		});

		let shardFinished = () => {
			if (sharder.finished > -1) sharder.finished++;
			if (sharder.finished === sharder.count) {
				// Print startup ascii message
				winston.info(`The best Discord Bot, version ${configJSON.version}, is now ready!`);
				// Use console.log because winston never lets us have anything fun, MOM
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

		sharder.IPC.on("finished", shardFinished);

		sharder.IPC.on("getGuild", async (msg, callback) => {
			try {
				let payload = msg;
				if (payload.guild !== "*") {
					let shardid = sharder.guilds.get(payload.guild);
					if (!shardid && shardid !== 0) {
						callback({ err: 404, guild: payload.guild, settings: payload.settings });
						return;
					}
					let result = await sharder.shards.get(shardid).getGuild(payload.guild, payload.settings);
					return callback({ err: null, guild: payload.guild, settings: payload.settings, result: result });
				} else {
					let results = [];
					sharder.shards.forEach(async shardd => {
						results.push(shardd.getGuilds(payload.settings));
					});
					let result = await Promise.all(results);
					return callback({ err: null, guild: payload.guild, settings: payload.settings, result: result.reduce((prev, value) => Object.assign(prev, value), {}) });
				}
			} catch (err) {
				let payload = msg;
				winston.warn("An error occured while fetching guild data from Discord l.l\n", err);
				return callback({ err: err, guild: payload.guild, settings: payload.settings });
			}
		});

		sharder.IPC.on("guilds", async msg => {
			let guilds = msg.latest;
			if (!guilds) guilds = [];
			for (let guild of guilds) {
				sharder.guilds.set(guild, parseInt(msg.shard));
			}
			if (msg.remove) {
				for (let guild of msg.remove) {
					sharder.guilds.delete(guild);
				}
			}
		});

		sharder.IPC.on("dashboardUpdate", async msg => {
			winston.silly(`Broadcasting update to dashboard at ${msg.location}.`);
			sharder.IPC.send("dashboardUpdate", { namespace: msg.namespace, location: msg.location }, "*");
		});

		sharder.IPC.on("muteMember", async msg => {
			const shardid = sharder.guilds.get(msg.guild);
			if (sharder.shards.has(shardid)) sharder.IPC.send("muteMember", msg, shardid);
		});

		sharder.IPC.on("unmuteMember", async msg => {
			const shardid = sharder.guilds.get(msg.guild);
			if (sharder.shards.has(shardid)) sharder.IPC.send("unmuteMember", msg, shardid);
		});

		sharder.IPC.on("createMOTD", async msg => {
			const shardid = sharder.guilds.get(msg.guild);
			if (sharder.shards.has(shardid)) sharder.IPC.send("createMOTD", msg, shardid);
		});

		sharder.IPC.on("cacheUpdate", async msg => {
			const shardid = sharder.guilds.get(msg.guild);
			if (sharder.shards.has(shardid)) sharder.IPC.send("cacheUpdate", msg, shardid);
		});

		sharder.IPC.on("sendAllGuilds", () => sharder.IPC.send("postAllData", {}, 0));

		sharder.IPC.on("createPublicInviteLink", msg => sharder.IPC.send("createPublicInviteLink", { guild: msg.guild }, sharder.guilds.get(msg.guild)));
		sharder.IPC.on("deletePublicInviteLink", msg => sharder.IPC.send("deletePublicInviteLink", { guild: msg.guild }, sharder.guilds.get(msg.guild)));

		sharder.IPC.on("eval", async (msg, callback) => {
			const promises = [];
			sharder.shards.forEach(shard => promises.push(shard.eval(msg)));
			callback(await Promise.all(promises));
		});

		sharder.IPC.on("leaveGuild", async msg => {
			const shardid = sharder.guilds.get(msg);
			if (sharder.shards.has(shardid)) sharder.IPC.send("leaveGuild", msg, shardid);
			sharder.guilds.delete(msg);
		});

		sharder.IPC.on("sendMessage", async msg => {
			const shardid = sharder.guilds.get(msg.guild);
			if (sharder.shards.has(shardid)) sharder.IPC.send("sendMessage", msg, shardid);
			else if (msg.guild === "*") sharder.IPC.send("sendMessage", msg, "*");
		});

		sharder.IPC.on("updateBot", async msg => sharder.IPC.send("updateBot", msg, "*"));

		sharder.spawn();
	}
});

process.on("uncaughtException", err => {
	winston.error("An unknown and unexpected error occurred, and we failed to handle it. Sorry! x.x\n", err);
	process.exit(1);
});

process.on("unhandledRejection", err => {
	winston.error("An unknown and unexpected error occurred, and we failed to handle it. Sorry! x.x\n", err);
	process.exit(1);
});
