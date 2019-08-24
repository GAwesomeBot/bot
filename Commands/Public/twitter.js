const getRSS = require("../../Modules/Utils/RSS.js");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");
const moment = require("moment");

module.exports = async ({ Constants: { Text, Colors, APIs } }, { serverDocument }, msg, commandData) => {
	let { suffix } = msg;
	if (suffix && suffix.startsWith("@")) {
		suffix = suffix.slice(1);
	}

	if (suffix) {
		let query = suffix.substring(0, suffix.lastIndexOf(" "));
		let num = suffix.substring(suffix.lastIndexOf(" ") + 1);

		if (!query || isNaN(num)) {
			query = suffix;
			num = serverDocument.config.command_fetch_properties.default_count;
		}
		if (num > serverDocument.config.command_fetch_properties.max_count) {
			num = serverDocument.config.command_fetch_properties.max_count;
		} else if (num < 1) {
			num = serverDocument.config.command_fetch_properties.default_count;
		} else {
			num = parseInt(num);
		}

		const m = await msg.channel.send(Text.THIRD_PARTY_FETCH("We're looking for the birbs 🐦"));

		const articles = await getRSS(APIs.TWITRSS(query), num).catch(err => {
			if (err === "invalid") return [];
			else throw err;
		});
		if (articles.length) {
			const descriptions = [];
			const titles = [];
			const urls = [];
			const timestamps = [];
			articles.forEach(article => {
				descriptions.push(article.contentSnippet);
				titles.push(article.creator);
				urls.push(article.link);
				timestamps.push(article.isoDate);
			});
			await m.delete().catch(() => null);
			await new PaginatedEmbed(msg, {
				color: Colors.TWITTER,
				footer: "Tweet {currentPage} out of {totalPages}",
			}, {
				descriptions,
				titles,
				urls,
				timestamps,
			}).init();
		} else {
			logger.debug(`Couldn't find twitter user '${query}' for ${commandData.name} command`, { msg: msg.id, svrid: msg.guild.id });
			m.edit({
				embed: {
					color: Colors.SOFT_ERR,
					description: `I couldn't find that user's tweets. They either don't exist, or don't have any public tweets! 🐦`,
					footer: {
						text: "Do you think this is an error? Let us know in our support Discord!",
					},
				},
			}).catch(() => null);
		}
	} else {
		msg.sendInvalidUsage(commandData, "Twitter what?", "Here's a birb anyways 🐦");
	}
};
