/**
 * Shared commands are the most basic command-like structure ever.
 * They are NOT expected to have any of the params the main commands have.
 * They should only ever expect the main object, the message and the command data!
 * Anything else is at the maintainers choice when creating commands.
 * Hell, you can make a custom shared command that runs under specific settings!
 */
module.exports = async (main, msg, commandData) => {
	/**
	 * @param {Discord.Message} msg The raw message
	 * Suffix is present in the msg object
	 */
	/**
	 * @type {Object}
	 * @param commandData Object containing the command name and usage.
	 * Use `client.getPMCommandMetadata(commandData.name)` for other things
	 */
	/**
	 * @type {Object}
	 * @param main Object containing the most important things
	 * Feel free to deconstruct it using { Value }
	 * @property {Discord.Client} client The client object
	 * @property {Object} configJS The config js object
	 * configJSON is in the global
	 */
};
