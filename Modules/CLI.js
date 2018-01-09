const { cli } = require("../Configurations/commands");
const {
	Errors: {
		Error: GABError,
	},
} = require("../Internals/index");

class CLI {
	constructor (sharder, db, traffic) {
		this.sharder = sharder;
		this.db = this.database = db;
		this.traffic = traffic;
		this.stdin = process.stdin;
		this.currentlyRunningCommand = null;
	}

	/**
	* Sets up all the stuff we need
	* @returns {CLI}
	*/
	setup () {
		this.stdin.on("data", this.listener.bind(this));
		return this;
	}

	/**
	* Disposes (destroys) all the CLI things.
	*/
	dispose () {
		this.stdin.removeListener("data", this.listener.bind(this));
	}

	/**
	* Listens to the incoming events from stdin
	* @param {Buffer} data The incoming data from the stdin
	*/
	listener (data) {
		let strData = data.toString();
		let trimmedData = strData.trim();
		if (!this.currentlyRunningCommand) {
			let [command, ...args] = trimmedData.split(" ");
			command = command.trim();
			const cmdData = this.getFullCommand(command);
			if (!cmdData) return;
			if (cmdData.data.isMultiline) {
				this.commandArgs = args.join(" ");
				this.currentlyRunningCommand = {
					data: cmdData.data,
					func: cmdData.func,
				};
			} else {
				try {
					cmdData.func({ cli: this }, cmdData.data, args.join(" "));
				} catch (err) {
					winston.error(`An error occurred while running this command:\n${err.stack}`);
				}
			}
		} else {
			if (this.currentlyRunningCommand.data.isMultiline) {
				if (trimmedData.endsWith(`\u0007`)) {
					trimmedData = trimmedData.replace(/\u0007/, "");
					this.commandArgs += trimmedData;
					try {
						this.currentlyRunningCommand.func({ cli: this }, this.currentlyRunningCommand.data, this.commandArgs);
					} catch (err) {
						winston.error(`An error occurred while running this command:\n${err.stack}`);
					}
					delete this.commandArgs;
				} else {
					this.commandArgs += strData;
				}
			}
			this.currentlyRunningCommand = null;
		}
	}

	/**
	 * Gets an object with both class and the command
	 * @param {String} commandName The command name
	 * @returns {Object} The command object
	 */
	getFullCommand (commandName) {
		if (typeof commandName !== "string") throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
		if (!this.getCommandData(commandName)) return null;
		return {
			data: this.getCommandData(commandName),
			func: this.getCommand(commandName),
		};
	}
	/**
	 * Gets a command object
	 * @param {String} commandName The command name
	 * @returns {Object} The command object
	 */
	getCommandData (commandName) {
		if (typeof commandName !== "string") throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
		return cli[commandName] || null;
	}

	/**
	 * Gets a command function
	 * @param {String} commandName The command name
	 * @returns {Function} The command function
	 */
	getCommand (commandName) {
		if (typeof commandName !== "string") throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
		if (!this.getCommandData(commandName)) return null;
		return require(`../Commands/CLI/${commandName}`);
	}
}

module.exports = CLI;
