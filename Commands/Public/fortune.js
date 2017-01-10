const unirest = require("unirest");

module.exports = function fortune(bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) {
	const categories = ["all", "computers", "cookie", "definitions", "miscellaneous", "people", "platitudes", "politics", "science", "wisdom"];
	if(suffix && categories.indexOf(suffix.toLowerCase())==-1) {
		msg.channel.createMessage(`Please pick a topic from this list: \`${categories.join("`, `")}\``).then(() => {
			bot.awaitMessage(msg.channel.id, msg.author.id, message => {
				message.content = message.content.trim();
				return categories.indexOf(message.content.toLowerCase())>-1;
			}, message => {
				fortune(bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, message, message.content.toLowerCase());
			});
		});
	} else {
		unirest.get(`http://yerkee.com/api/fortune/${suffix}`).headers("Accept", "application/json").end(res => {
			if(res.status==200) {
				msg.channel.createMessage(res.body.fortune);
			} else {
				winston.warn("Failed to fetch fortune", {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage("I honestly don't know 😐");
			}
		});
	}
};
