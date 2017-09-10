/**
 * This is a full documented base file for PM commands
 * Use this as a base for coding
 */
module.exports = async (main, userDocument, msg, suffix, commandData) => {
	/**
	 * @param {Document} userDocument The user document of the user that ran this command
	 * @param {Discord.Message} msg The raw message
	 * @param {?String} suffix The suffix of the command, if any
	 */
	/**
	 * @type {Object}
	 * @param commandData Object containing the command name and usage.
	 * Use `bot.getPMCommandMetadata(commandData.name)` for other things
	 */
	/**
	 * @type {Object}
	 * @param main Object containing the most important things
	 * Feel free to deconstruct it using { Value }
	 * @property {Discord.Client} bot The bot object
	 * @property {Database} db The database connection
	 * @property {Object} configJS The config js object
	 * @property {Object} configJSON The config json object
	 * @property {Object} Utils Util object
	 * @property {Object} utils Util object
	 */
};
