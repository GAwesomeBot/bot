const getRSS = require("./../../Modules/RSS.js");
const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix) {
		let query = suffix.substring(0, suffix.lastIndexOf(" "));
		let num = suffix.substring(suffix.lastIndexOf(" ")+1);

		if(!query || isNaN(num)) {
			query = suffix;
			num = serverDocument.config.command_fetch_properties.default_count;
		}
		if(num<1 || num>serverDocument.config.command_fetch_properties.max_count) {
			num = serverDocument.config.command_fetch_properties.default_count;
		} else {
			num = parseInt(num);
		}

		let url = query;
		const feedDocument = serverDocument.config.rss_feeds.id(query);
		if(feedDocument) {
			url = feedDocument.url;
		}

		getRSS(winston, url, num, (err, articles) => {
			if(err || articles.length==0) {
				winston.warn(`No RSS articles found at '${url}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage("I looked everywhere but I couldn't find anything 🏳️");
			} else {
				bot.sendArray(msg.channel, articles.reverse().map(a => {
					return `${moment(a.published).fromNow()}: **${a.title}**\n<${a.link}>`;
				}));
			}
		});
	} else {
		const info = serverDocument.config.rss_feeds.map(feedDocument => {
			return feedDocument._id;
		});
		if(info.length>0) {
			msg.channel.createMessage(`The following feeds are available: 📑\n\t${info.join("\n\t")}`);
		} else {
			msg.channel.createMessage("There aren't any RSS feeds available on this server. Go to the `RSS Feeds` section of the admin console to add one.");
		}
	}
};
