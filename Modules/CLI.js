<<<<<<< HEAD
=======
const { EOL } = require("os");
>>>>>>> [CLI] Let's work on it
const { cli } = require("../Configurations/commands");
const {
	Errors: {
		Error: GABError,
	},
} = require("../Internals/index");
class CLI {
<<<<<<< HEAD
	constructor (sharder) {
		this.sharder = sharder;
=======
	constructor (client) {
		this.bot = this.client = client;
>>>>>>> [CLI] Let's work on it
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
	* Disposes (destroys) all the CLI things.*/
	dispose () {
		this.stdin.removeListener("data", this.listener.bind(this));
	}

	/**
	* Listens to the incoming events from stdin
	* @param {Buffer} data The incoming data from the stdin
	 * */
	listener (data) {
		let strData = data.toString();
		if (!this.currentlyRunningCommand) {
			let [command, ...args] = strData.split(" ");
			command = command.trim();
			const cmdData = this.getFullCommand(command);
			if (!cmdData) return;
			const [command, ...args] = strData.split(" ");
			const cmdData = this.getFullCommand(command);
			if (!cmdData) return;
			const commandClass = new cmdData.class(this.bot);
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
				let trimmedData = strData.trim();
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
					this.commandArgs += trimmedData;
				}
			}
			delete this.currentlyRunningCommand;
		}
	}

	/**
	 * Gets an object with both class and the command
	 * @param {String} commandName The command name
	 * @returns {Object} The command object*/
	getFullCommand (commandName) {
<<<<<<< HEAD
		if (typeof commandName !== "string") throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
		if (!this.getCommandData(commandName)) return null;
		return {
			data: this.getCommandData(commandName),
			func: this.getCommand(commandName),
=======
		if (!(commandName instanceof String)) throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
		if (!this.getCommandData(commandName)) return null;
		return {
			data: this.getCommandData(commandName),
			class: this.getCommand(commandName),
>>>>>>> [CLI] Let's work on it
		};
	}
	/**
	 * Gets a command object
	 * @param {String} commandName The command name
	 * @returns {Object} The command object*/
	getCommandData (commandName) {
<<<<<<< HEAD
		if (typeof commandName !== "string") throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
=======
		if (!(commandName instanceof String)) throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
>>>>>>> [CLI] Let's work on it
		return cli[commandName] || null;
	}

	/**
<<<<<<< HEAD
	 * Gets a command function
	 * @param {String} commandName The command name
	 * @returns {Function} The command function
	 */
	getCommand (commandName) {
		if (typeof commandName !== "string") throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
=======
	 * Gets a command class
	 * @param {String} commandName The command name
	 * @returns {Object} The command class | TODO: make the class a typedef or something
	 */
	getCommand (commandName) {
		if (!(commandName instanceof String)) throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
>>>>>>> [CLI] Let's work on it
		if (!this.getCommandData(commandName)) return null;
		return require(`../Commands/CLI/${commandName}`);
	}
}

module.exports = CLI;
