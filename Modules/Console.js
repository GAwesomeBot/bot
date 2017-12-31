const winston = require("winston");
const chalk = require("chalk");
const moment = require("moment");
require("winston-daily-rotate-file");

const config = require("./../Configurations/config.js");

module.exports = class Console {
	/**
	 * Gets you a winston instance pre-configured with everything that you need.
	 * @param {string} type The type that determines the label (master for the master sharder, otherwise Shard ID)
	 */
	constructor (type) {
		const levels = {
			error: 0,
			warn: 1,
			info: 2,
			debug: 3,
			verbose: 4,
			silly: 5,
		};
		return new winston.Logger({
			levels: levels,
			transports: [
				new winston.transports.Console({
					level: config.consoleLevel,
					colorize: true,
					label: `${type === "master" ? "Master" : type}`,
					timestamp: () => `[${chalk.grey(moment().format("HH:mm:ss"))}]`,
				}),
				new winston.transports.DailyRotateFile({
					level: config.fileLevel,
					colorize: false,
					datePattern: `dd-MM-yyyy.`,
					prepend: true,
					json: false,
					// eslint-disable-next-line no-unused-vars
					formatter: ({ level, message = "", meta = {}, formatter, depth, colorize }) => {
						const ts = moment().format("DD-MM-YYYY HH:mm:ss");
						const obj = Object.keys(meta).length ? `\n\t${meta.stack ? meta.stack : require("util").inspect(meta, false, depth || 2, colorize)}` : ``;
						return `(${ts}) (${level.toUpperCase()}) (${type === "master" ? "MASTER" : type.toUpperCase()}) ${chalk.stripColor(message)} ${obj}`;
					},
					filename: require("path").join(process.cwd(), `logs/${type === "master" ? "master" : type.replace(/ /g, "-")}-gawesomebot.log`),
				}),
				new winston.transports.DailyRotateFile({
					name: "Full Output",
					level: config.fileLevel,
					colorize: false,
					datePattern: `dd-MM-yyyy.`,
					prepend: true,
					json: false,
					// eslint-disable-next-line no-unused-vars
					formatter: ({ level, message = "", meta = {}, formatter, depth, colorize }) => {
						const ts = moment().format("DD-MM-YYYY HH:mm:ss");
						const obj = Object.keys(meta).length ? `\n\t${meta.stack ? meta.stack : require("util").inspect(meta, false, depth || 2, colorize)}` : ``;
						return `(${ts}) (${level.toUpperCase()}) (${type === "master" ? "MASTER" : type.toUpperCase()}) ${chalk.stripColor(message)} ${obj}`;
					},
					filename: require("path").join(process.cwd(), `logs/gawesomebot.log`),
				}),
				new winston.transports.File({
					level: config.consoleLevel,
					json: true,
					colorize: false,
					filename: require("path").join(process.cwd(), `logs/verbose.gawesomebot.log`),
				}),
			],
		});
	}
};
