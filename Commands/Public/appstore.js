const iTunes = require("../../Modules/Utils/SearchiTunes");
const ArgParser = require("../../Modules/MessageUtils/Parser");

module.exports = async ({ Constants: { Colors } }, documents, msg, commandData) => {
	if (msg.suffix) {
		const apps = ArgParser.parseQuoteArgs(msg.suffix, ",");
		const results = [];
		for (const app of apps) {
			let res;
			try {
				[res] = await iTunes({ entity: "software", country: "US", term: app, limit: 1 });
			} catch (err) {
				logger.verbose(`Couldn't find any Apple app called "${app}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
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
			msg.channel.send(msgObj).catch(err => logger.debug(`Failed to send appstore result.`, {}, err));
		}
	} else {
		msg.send({
			embed: {
				color: Colors.LIGHT_RED,
				description: `[What app would you like to find today...?](https://www.apple.com/itunes/charts/free-apps/) 🤔`,
			},
		});
	}
};
