/* eslint-disable max-len */
const database 		= require("./Database/Driver.js");
const auth 				= require("./Configurations/auth.js");
const configJS 		= require("./Configurations/config.js");
const Discord			= require("discord.js");
const { Console, SharderIPC } = require("./Modules/");

// Set up a winston instance for the Master Process
global.winston = new Console("master");

winston.info(`Logging to ${require("path").join(process.cwd(), `logs/master-gawesomebot.log`)}.`);

database.initialize(configJS.databaseURL).catch(err => {
	winston.error(`An error occurred while connecting to MongoDB! Is the database online?\n`, err);
	process.exit(-1);
}).then(async () => {
	const db = database.getConnection();
	if (db) {
		await winston.info(`Connected to the database successfully.`);
		await db.db.db("admin").command({ getCmdLineOpts: 1 }).then(res => {
			if (!res.parsed || !res.parsed.net || !res.parsed.net.bindIp) {
				winston.warn("Your MongoDB instance appears to be opened to the wild, wild web. Please make sure authorization is enforced!");
			}
		});
		if (!auth.discord.clientToken) {
			winston.error("You must provide a clientToken in \"Configurations/auth.js\" to open the gates to Discord! x(");
			return;
		}
		if (configJS.shardTotal !== "auto" && configJS.shardTotal < 1) {
			throw new RangeError(`In config.js, shardTotal must be greater than or equal to 1`);
		}
		const sharder = await new Discord.ShardingManager("./Discord.js", {
			totalShards: configJS.shardTotal,
			token: auth.discord.clientToken,
		});
		sharder.on("launch", shard => {
			winston.info(`Shard ${shard.id} launched.`, { shard: shard.id });
		});
		sharder.IPC = await new SharderIPC(sharder, winston);
		await sharder.IPC.listen();
		// Sharder events
		sharder.IPC.on("ready", (msg, shard) => {
			if (shard === sharder.totalShards - 1) {
				winston.info("All shards ready.");
			}
		});
		sharder.IPC.once("warnDefaultSecret", (msg, shard) => { // eslint-disable-line no-unused-vars
			winston.warn("Your secret value appears to be set to the default value. Please note that this value is public, and your session cookies can be edited by anyone!");
		});
		sharder.spawn();
	}
});
