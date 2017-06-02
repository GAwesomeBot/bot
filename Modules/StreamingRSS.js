const getRSS = require("./../Modules/RSS.js");
const moment = require("moment");

// Send streaming RSS updates for a server
module.exports = (bot, winston, svr, serverDocument, feedDocument, callback) => {
	getRSS(winston, feedDocument.url, 100, (err, articles) => {
		if(!err && articles && articles.length > 0 && articles[0]) {
			let info = [];
			if(feedDocument.streaming.last_article_title != articles[0].link) {
				const getNewArticles = forceAdd => {
					let adding = forceAdd;
					for(let i = articles.length - 1; i >= 0; i--) {
						if(articles[i].link == feedDocument.streaming.last_article_title) {
							adding = true;
						} else if(adding) {
							info.push(`\`${moment(articles[i].published).format("MMMM DD, YYYY [at] hh:mmA Z")}\` **${articles    [i].title}**\n${articles[i].link}`);
						}
					}
				};
				getNewArticles(feedDocument.streaming.last_article_title == "");
				info.slice(1);
				if(info.length == 0) {
					getNewArticles(true);
				}
			}

			if(info.length > 0) {
				feedDocument.streaming.last_article_title = articles[0].link;
				serverDocument.save(err => {
					if(err) {
						winston.error(`Failed to save data for RSS feed '${feedDocument._id}'`, {svrid: svr.id}, err);
					}
				});
				winston.info(`${info.length} new in feed ${feedDocument._id} on server '${svr.name}'`, {svrid: svr.id});
				for(let i=0; i<feedDocument.streaming.enabled_channel_ids.length; i++) {
					const ch = svr.channels.get(feedDocument.streaming.enabled_channel_ids[i]);
					if(ch) {
						bot.sendArray(ch, [`${info.length} new in feed **${feedDocument._id}**:`].concat(info));
					}
				}
			}
		}
		callback();
	});
};
