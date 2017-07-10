const getRSS = require("./../../Modules/RSS.js");
const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix.startsWith("@")) {
		suffix = suffix.slice(1);
	}

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

		getRSS(winston, `http://twitrss.me/twitter_user_to_rss/?user=${encodeURIComponent(query)}`, num, (err, articles) => {
			if(err || articles.length==0) {
				winston.warn(`Twitter user '${query}' not found`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage(`I can't find a ${query} on Twitter 🐦`);
			} else {
				const info = articles.reverse().map(a => {
					return `${a.author}, ${moment(a.published).fromNow()}\n**<${a.link}>**` + `\`\`\`${a.title}\`\`\``;
				});
				bot.sendArray(msg.channel, info);
			}
		});
	} else {
		msg.channel.createMessage("https://twitter.com 🐦");
	}
};