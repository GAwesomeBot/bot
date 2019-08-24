const getRSS = require("./RSS");
const moment = require("moment");

/**
 * Send streaming RSS updates for a server
 * @param {Guild} server The server to send in
 * @param serverDocument The server document
 * @param feedDocument The RSS document from the serverDocument
 */
/* eslint-disable require-await*/
module.exports = async (client, server, serverDocument, feedDocument) => {
	const feedQueryDocument = serverDocument.query.id("config.rss_feeds", feedDocument._id);

	let articles;
	try {
		articles = await getRSS(feedDocument.url, 100);
	} catch (err) {
		if (err === "invalid") {
			await client.logMessage(serverDocument, "warn", `Failed to fetch articles for RSS Feed ${feedDocument._id}. URL might be configured incorrectly!`);
		} else {
			throw err;
		}
	}
	if (articles && articles.length > 0 && articles[0]) {
		const info = [];
		if (feedDocument.streaming.last_article_title !== articles[0].link) {
			const getNewArticles = forceAdd => {
				let adding = forceAdd;
				for (let i = articles.length - 1; i >= 0; i--) {
					if (articles[i].link === feedDocument.streaming.last_article_title) {
						adding = true;
					} else if (adding) {
						info.push({
							color: 0x3669FA,
							footer: {
								text: `Published at ${moment(articles[i].isoDate).format("DD MMMM YYYY [at] HH:mm Z [UK Time]")}`,
							},
							title: `${articles[i].title}`,
							url: articles[i].link || "",
							author: {
								name: articles[i].creator,
							},
							description: `Read more [here](${articles[i].link})`,
						});
					}
				}
			};
			getNewArticles(feedDocument.streaming.last_article_title === "");
			if (info.length === 0) getNewArticles(true);
		}

		if (info.length > 0) {
			feedQueryDocument.set("streaming.last_article_title", articles[0].link);
			await serverDocument.save().catch(err => {
				logger.debug(`Failed to save server data for RSS feed "${feedDocument._id}"`, { svrid: server.id }, err);
			});
			logger.verbose(`${info.length} new in feed "${feedDocument._id}" on server "${server}"`, { svrid: server.id });
			for (let i = 0; i < feedDocument.streaming.enabled_channel_ids.length; i++) {
				const channel = server.channels.get(feedDocument.streaming.enabled_channel_ids[i]);
				if (channel) {
					try {
						await channel.send({
							embed: {
								color: 0x3669FA,
								description: `${info.length} new in feed **${feedDocument._id}**:`,
							},
						});
						for (const embed of info) {
							await channel.send({
								embed: embed,
							});
						}
					} catch (err) {
						logger.debug(`Failed to send RSS Streaming updates to server.`, { svrid: server.id, chid: channel.id }, err);
					}
				}
			}
		}
	}
};
