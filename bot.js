const database 		= require("./Database/Driver.js");
const auth 				= require("./Configurations/auth.js");
const configJS 		= require("./Configurations/config.js");
const configJSON 	= require("./Configurations/config.json");

/*
 * The following vars shouldn't be used:
 * wanston, used for initializing the global winston variable. Use that instead
 * chalk, moment, winston-rotate-files are only used in the logger creation process as well
 * So you should require them whenever needed.
 * These variables are more for the logger setup than for general usage
 */
const wanston = require("winston");
const chalk 	= require("chalk");
const moment 	= require("moment");
require("winston-daily-rotate-file");

// Set up default Winston Logger File and Global Instance
global.winston = new wanston.Logger({
	transports: [
		new wanston.transports.Console({
			level: "silly",
			colorize: true,
			/* Shard-based labels?
			 * Could have something like GAB Master Process for that, or GAB Shard?
			 * We can then make a special winston for master sharder, and log them separately
			 */
			label: `GAwesomeBot`,
			timestamp: () => `[${chalk.grey(moment().format("HH:mm:ss"))}]`,
		}),
		new wanston.transports.DailyRotateFile({
			level: "silly",
			colorize: false,
			datePattern: `dd-MM-yyyy.`,
			prepend: true,
			json: false,
			// eslint-disable-next-line no-unused-vars
			formatter: ({ level, message = "", meta = {}, formatter, depth, colorize }) => {
				const timestamp = moment().format("DD-MM-YYYY HH:mm:ss");
				const obj = Object.keys(meta).length ? `\n\t${meta.stack ? meta.stack : require("util").inspect(meta, false, depth || 2, colorize)}` : ``;
				return `${timestamp} ${level.toUpperCase()} ${chalk.stripColor(message)} ${obj}`;
			},
			filename: require("path").join(process.cwd(), `logs/gawesomebot.log`),
		}),
	],
});
winston.info(`Logging to ${require("path").join(process.cwd(), "logs/gawesomebot.log")}.`);

database.initialize(configJS.databaseURL).catch(err => {
	winston.error(`An error occurred while connecting to MongoDB! Is the database online?\n`, err);
	process.exit(-1);
}).then(() => {
	var db = database.getConnection();
	if (db) {
		winston.info(`Connected to the database successfully.`);
		const bot = require("./Discord.js")(db, configJS, configJSON);
		bot.login(auth.discord.clientToken).then(token => {
			winston.info("Started Bot Application", { token: token });
		}).catch(err => {
			winston.error(`Failed to connect to Discord :/\n`, err);
		});
		bot.on("debug", info => {
			winston.debug(info);
		});
		// Debug here
		// process.exit(0);
	}
});
