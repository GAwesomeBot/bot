const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		unirest.get(`http://api.duckduckgo.com/?format=json&q=${encodeURIComponent(suffix)}`).header("Accept", "application/json").end(res => {
			if(res.status == 200) {
				const data = JSON.parse(res.body);
				if(data.Results.length > 0 && data.AbstractText) {
					msg.channel.createMessage(`\`\`\`${data.AbstractText}\`\`\`${data.Results[0].FirstURL}`);
					return;
				}
			}
			winston.warn(`DuckDuckGo instant answer for '${suffix}' not found`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0xFF0000,
					description: "DuckDuckGo can't answer that. Maybe try Google? 😉"
				}
			});
		});
	} else {
		winston.warn(`Parameters not provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0xFF0000,
				description: `Wtf am I supposed to do with nothing?`
			}
		});
	}
};
