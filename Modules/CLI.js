<<<<<<< HEAD
<<<<<<< HEAD
=======
const { EOL } = require("os");
>>>>>>> [CLI] Let's work on it
=======
>>>>>>> let's get some Premium Support:tm:
const { cli } = require("../Configurations/commands");
const {
	Errors: {
		Error: GABError,
	},
} = require("../Internals/index");
class CLI {
<<<<<<< HEAD
<<<<<<< HEAD
	constructor (sharder) {
		this.sharder = sharder;
=======
	constructor (client) {
		this.bot = this.client = client;
>>>>>>> [CLI] Let's work on it
=======
	constructor (sharder) {
		this.sharder = sharder;
>>>>>>> let's get some Premium Support:tm:
		this.stdin = process.stdin;
		this.currentlyRunningCommand = null;
	}

	writeArrow () {
		process.stdout.write(">");
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
<<<<<<< HEAD
				if (trimmedData.endsWith(`\u0007`)) {
					trimmedData = trimmedData.replace(/\u0007/, "");
					this.commandArgs += trimmedData;
					try {
						this.currentlyRunningCommand.func({ cli: this }, this.currentlyRunningCommand.data, this.commandArgs);
					} catch (err) {
						winston.error(`An error occurred while running this command:\n${err.stack}`);
=======
				if (trimmedData.endsWith(`\u001a`)) {
					trimmedData = trimmedData.replace(/\u001a$/, "'");
					try {
						this.currentlyRunningCommand.func({ cli: this }, this.currentlyRunningCommand.data, this.commandArgs);
					} catch (err) {
						winston.error(`An error occurred while running this comma:nd\n${err.stack}`);
>>>>>>> let's get some Premium Support:tm:
					}
					delete this.commandArgs;
				} else {
					this.commandArgs += trimmedData;
				}
			}
			delete this.currentlyRunningCommand;
		}
		this.writeArrow();
	}

	/**
	 * Gets an object with both class and the command
	 * @param {String} commandName The command name
	 * @returns {Object} The command object*/
	getFullCommand (commandName) {
<<<<<<< HEAD
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
=======
		if (typeof commandName !== "string") throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
		if (!this.getCommandData(commandName)) return null;
		return {
			data: this.getCommandData(commandName),
			func: this.getCommand(commandName),
>>>>>>> let's get some Premium Support:tm:
		};
	}
	/**
	 * Gets a command object
	 * @param {String} commandName The command name
	 * @returns {Object} The command object*/
	getCommandData (commandName) {
<<<<<<< HEAD
<<<<<<< HEAD
		if (typeof commandName !== "string") throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
=======
		if (!(commandName instanceof String)) throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
>>>>>>> [CLI] Let's work on it
=======
		if (typeof commandName !== "string") throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
>>>>>>> let's get some Premium Support:tm:
		return cli[commandName] || null;
	}

	/**
<<<<<<< HEAD
<<<<<<< HEAD
	 * Gets a command function
	 * @param {String} commandName The command name
	 * @returns {Function} The command function
	 */
	getCommand (commandName) {
		if (typeof commandName !== "string") throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
=======
	 * Gets a command class
=======
	 * Gets a command function
>>>>>>> let's get some Premium Support:tm:
	 * @param {String} commandName The command name
	 * @returns {Function} The command function
	 */
	getCommand (commandName) {
<<<<<<< HEAD
		if (!(commandName instanceof String)) throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
>>>>>>> [CLI] Let's work on it
=======
		if (typeof commandName !== "string") throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
>>>>>>> let's get some Premium Support:tm:
		if (!this.getCommandData(commandName)) return null;
		return require(`../Commands/CLI/${commandName}`);
	}
}

module.exports = CLI;
