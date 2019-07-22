const { inspect } = require("util");
const { createLogger, transports, format } = require("winston");
const chalk = require("chalk");
require("winston-daily-rotate-file");

const { Error: GABError, TypeError: GABTypeError, RangeError: GABRangeError } = require("./Errors");

const config = require("./../Configurations/config.js");

const LOGGING_LEVELS = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
	verbose: 4,
	silly: 5,
};
const ERROR_SYMBOL = Symbol("Error");

module.exports = class Logger {
	/**
	 * Construct a new Logger instance. Allows for powerful logging using winston.
	 * @param {string} type The type that determines the label (master for the master sharder, otherwise Shard ID)
	 */
	constructor (type) {
		this.levels = LOGGING_LEVELS;
		this.winstonLogger = createLogger({
			levels: this.levels,
			transports: [
				new transports.Console({
					level: config.consoleLevel,
					format: format.combine(
						format.colorize(),
						format.timestamp({ format: "DD-MM-YYYY HH:mm:ss" }),
						format.label({ label: `${type === "master" ? "Master" : type}` }),
						format.printf(this.formatMessage.bind(this)),
					),
				}),
				new transports.DailyRotateFile({
					level: config.fileLevel,
					format: format.combine(
						format.timestamp({ format: "DD-MM-YYYY HH:mm:ss" }),
						format(this.formatJSON)(),
						format.json(),
					),
					datePattern: `DD-MM-YYYY`,
					filename: require("path").join(process.cwd(), `logs/%DATE%.${type === "master" ? "master" : type.replace(/ /g, "-").toLowerCase()}.gawesomebot.log`),
				}),
			],
		});

		Object.keys(this.levels).forEach(level => {
			if (!this[level]) this[level] = this.buildLevelFunction(level);
		});
	}

	formatMessage ({ level, message, label, timestamp, ...meta }) {
		const metadata = {};
		Object.keys(meta).forEach(key => {
			if (typeof key === "symbol") return;
			metadata[key] = meta[key];
		});
		const log = `[${chalk.grey(timestamp)}] [${label}] ${level}: ${message}`;
		if (meta[ERROR_SYMBOL]) return this.formatErrorMessage(log, metadata, meta[ERROR_SYMBOL]);
		return `${log}${this.formatMetadata(metadata)}`;
	}

	formatErrorMessage (log, metadata, error) {
		if ([GABError, GABTypeError, GABRangeError].includes(error.constructor)) {
			if (error._meta) Object.assign(metadata, error._meta);
			delete error._meta;
		}
		const logMessage = `${log}${this.formatMetadata(metadata)}`;
		return `${logMessage} ${inspect(error, { colors: true, breakLength: Infinity, depth: 1 })}`;
	}

	formatMetadata (metadata) {
		return Object.keys(metadata).length ? ` ${inspect(metadata, { colors: true, breakLength: Infinity, depth: 1 })}` : "";
	}

	formatJSON ({ [ERROR_SYMBOL]: error, ...meta }) {
		if (error) {
			if ([GABError, GABTypeError, GABRangeError].includes(error.constructor)) {
				if (error._meta) Object.assign(meta, error._meta);
				delete error._meta;
			}
			meta.error = inspect(error, { breakLength: Infinity, depth: 1 });
		}
		return meta;
	}

	buildLevelFunction (level) {
		return (message, meta, error) => {
			if (error) meta[ERROR_SYMBOL] = error;
			return this.winstonLogger[level](message, meta);
		};
	}
};
