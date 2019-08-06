const getRSS = require("../../Modules/Utils/RSS.js");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");
const moment = require("moment");

module.exports = async ({ Constants: { Colors, Text } }, { serverDocument }, msg, commandData) => {
	if (msg.suffix) {
		let query = msg.suffix.substring(0, msg.suffix.lastIndexOf(" "));
		let num = msg.suffix.substring(msg.suffix.lastIndexOf(" ") + 1);

		if (!query || isNaN(num)) {
			query = msg.suffix;
			num = serverDocument.config.command_fetch_properties.default_count;
		}
		if (num < 1 || num > serverDocument.config.command_fetch_properties.max_count) {
			num = serverDocument.config.command_fetch_properties.default_count;
		} else {
			num = parseInt(num);
		}

		const feedDocument = serverDocument.config.rss_feeds.id(query);
		const url = feedDocument ? feedDocument.url : query;

		await msg.send(Text.THIRD_PARTY_FETCH(`I'm reading your RSS Feed`));

		let articles;
		try {
			articles = await getRSS(url, num);
		} catch (err) {
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "I couldn't read that RSS Feed 🏳️",
				},
			}).catch(() => null);
		}

		if (articles && articles.length) {
			const descriptions = [];
			const titles = [];
			const footers = [];
			const urls = [];
			articles.forEach(article => {
				urls.push(article.link || "");
				descriptions.push(`Read more [here](${article.link})`);
				titles.push(article.title);
				footers.push(`Published at ${moment(article.isoDate).format("DD MMMM YYYY [at] HH:mm Z")}`);
			});
			await new PaginatedEmbed(msg, {
				color: Colors.RESPONSE,
				footer: `{footer} • Article {currentPage} out of {totalPages}`,
			}, {
				urls,
				descriptions,
				titles,
				footers,
			}).init(300000, true);
		} else {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "I looked everywhere but I couldn't find anything 🏳️",
				},
			}).catch(() => null);
		}
	} else {
		const info = serverDocument.config.rss_feeds.map(feedDocument => feedDocument._id);
		if (info.length) {
			msg.send({
				embed: {
					color: Colors.INFO,
					title: `The following feeds are available: 📑`,
					description: `${info.join("\n\t")}`,
				},
			}).catch(() => null);
		} else {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "There aren't any RSS feeds available on this server. Go to the `RSS Feeds` section of the Admin Console to add one.",
				},
			}).catch(() => null);
		}
	}
};
