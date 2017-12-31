const { RSS: getRSS } = require("./");
const moment = require("moment");

/**
 * Send streaming RSS updates for a server
 * @param {Guild} server The server to send in
 * @param serverDocument The server document
 * @param feedDocument The RSS document from the serverDocument
 */
/* eslint-disable require-await*/
module.exports = async (bot, server, serverDocument, feedDocument) => {
	getRSS(feedDocument.url, 100).then(async articles => {
		if (articles && articles.length > 0 && articles[0]) {
			let info = [];
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
									text: `Published at ${moment(articles[i].published).format("DD MMMM YYYY [at] HH:mm Z [UK Time]")}`,
								},
								title: `${articles[i].title}`,
								url: articles[i].link || "",
								author: {
									name: articles[i].author || articles[i].feed.name,
								},
								description: `Read more [here](${articles[i].link})`,
							});
						}
					}
				};
				getNewArticles(feedDocument.streaming.last_article_title === "");
				info = info.slice(1);
				if (info.length === 0) getNewArticles(true);
			}

			if (info.length > 0) {
				feedDocument.streaming.last_article_title = articles[0].link;
				await serverDocument.save().catch(err => {
					winston.warn(`Failed to save server data for RSS feed "${feedDocument._id}"`, { svrid: server.id }, err);
				});
				winston.info(`${info.length} new in feed "${feedDocument._id}" on server "${server}"`, { svrid: server.id });
				for (let i = 0; i < feedDocument.streaming.enabled_channel_ids.length; i++) {
					const channel = server.channels.get(feedDocument.streaming.enabled_channel_ids[i]);
					if (channel) {
						channel.send({
							embed: {
								color: 0x3669FA,
								description: `${info.length} new in feed **${feedDocument._id}**:`,
							},
						}).then(() => {
							for (const embed of info) {
								channel.send({
									embed: embed,
								});
							}
						});
					}
				}
			}
		}
	}).catch(err => {
		winston.error(`Failed to get RSS articles.. >.>\n`, err);
	});
};
