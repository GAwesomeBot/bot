const { EOL } = require("os");
const { cli } = require("../Configurations/commands");
const {
	Errors: {
		Error: GABError,
	},
} = require("../Internals/index");
class CLI {
	constructor (client) {
		this.bot = this.client = client;
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
			const [command, ...args] = strData.split(" ");
			const cmdData = this.getFullCommand(command);
			if (!cmdData) return;
			const commandClass = new cmdData.class(this.bot);
			if (cmdData.data.isMultiline) {
				this.commandArgs = args.join(" ");
				this.currentlyRunningCommand = {
					data: cmdData.data,
					class: commandClass,
				};
			} else {
				commandClass.run(cmdData.data, args.join(" "));
			}
		} else {
			if (this.currentlyRunningCommand.data.isMultiline) {
				if (strData.endsWith(`\u001a${EOL}`)) {
					strData = strData.replace(/\u001a[\r\n]{1,2}$/, "'");
					this.commandArgs += strData;
					this.currentlyRunningCommand.class.run(this.currentlyRunningCommand.data, {
						args: this.commandArgs,
					});
					delete this.commandArgs;
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
		if (!(commandName instanceof String)) throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
		if (!this.getCommandData(commandName)) return null;
		return {
			data: this.getCommandData(commandName),
			class: this.getCommand(commandName),
		};
	}
	/**
	 * Gets a command object
	 * @param {String} commandName The command name
	 * @returns {Object} The command object*/
	getCommandData (commandName) {
		if (!(commandName instanceof String)) throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
		return cli[commandName] || null;
	}

	/**
	 * Gets a command class
	 * @param {String} commandName The command name
	 * @returns {Object} The command class | TODO: make the class a typedef or something
	 */
	getCommand (commandName) {
		if (!(commandName instanceof String)) throw new GABError("CLI_PARAM_INVALID", "commandName", commandName.constructor.name, "String");
		if (!this.getCommandData(commandName)) return null;
		return require(`../Commands/CLI/${commandName}`);
	}
}

module.exports = CLI;
