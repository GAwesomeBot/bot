const iTunes = require("../../Modules/Utils/SearchiTunes");
const ArgParser = require("../../Modules/MessageUtils/Parser");

module.exports = async ({ Constants: { Colors } }, documents, msg, commandData) => {
	/**
	 * @param {Discord.Message} msg The message object
	 * Suffix is present in the msg object
	 * @type {Object}
	 * @param commandData Object containing the command name, usage and description.
	 * Use `bot.getPMCommandMetadata(commandData.name)` for other things
	 */
	/**
	 * @type {Object}
	 * @param documents Object containing all documents you need.
	 * Available documents:
	 * * serverDocument
	 * * channelDocument
	 * * memberDocument
	 * * userDocument
	 */
	/**
	 * @type {Object}
	 * @param main Object containing the most important things
	 * Feel free to deconstruct it using { Value }
	 * @property {Discord.Client} bot The bot object
	 * @property {Object} configJS The config js object
	 * @property {Object} Utils Util object
	 * @property {Object} utils Util object
	 * @property {Object} Constants Constants Object
	 * configJSON is in the global
	 */
	if (msg.suffix) {
		let apps = ArgParser.parseQuoteArgs(msg.suffix, ",");
		let results = [];
		for (const app of apps) {
			let res;
			try {
				res = (await iTunes({ entity: "software", country: "US", term: app, limit: 1 }))[0];
			} catch (err) {
				winston.verbose(`Couldn't find any Apple app called "${app}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				results.push({
					embed: {
						color: 0xFF0000,
						description: `There were no results for the app called \`${app}\`. ❌`,
						footer: {
							text: `You should try searching for the app again, making sure you spelt it right.`,
						},
					},
				});
			}
			if (res) {
				results.push({
					embed: {
						color: 0x00FF00,
						author: {
							name: `By ${res.artistName}`,
							url: res.sellerUrl ? res.sellerUrl : "",
						},
						thumbnail: {
							url: res.artworkUrl100 ? res.artworkUrl100 : "",
						},
						title: `__${res.trackCensoredName}__`,
						description: `A quick summary: \`\`\`\n${res.description.split("\n")[0]}\`\`\``,
						url: `${res.trackViewUrl}`,
						footer: {
							text: `Rated ${res.averageUserRating} ⭐ | ${res.formattedPrice.toLowerCase() === "free" ? "This app is free" : `The price of the app is ${res.formattedPrice}`}`,
						},
					},
				});
			}
		}
		for (const msgObj of results) {
			msg.channel.send(msgObj);
		}
	} else {
		msg.channel.send({
			embed: {
				color: Colors.LIGHT_RED,
				description: `[What app would you like to find today...?](https://www.apple.com/itunes/charts/free-apps/) 🤔`,
			},
		});
	}
};
