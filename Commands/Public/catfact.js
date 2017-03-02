const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	let num = suffix;
	if(!num) {
		num = 1;
	}
	if(isNaN(num) || num < 1 || num > serverDocument.config.command_fetch_properties.max_count) {
		num = serverDocument.config.command_fetch_properties.default_count;
	}
	unirest.get(`http://catfacts-api.appspot.com/api/facts?number=${num}`).header("Accept", "application/json").end(res => {
		if(res.status == 200) {
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
					description: JSON.parse(res.body).facts
				}
			});
		} else {
			winston.error("Failed to fetch cat fact(s)", {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x9ECDF2,
					description: "Cats exist and are cute af. 😻"
				}
			});
		}
	});
};
