const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		unirest.get(`https://8ball.delegator.com/magic/JSON/${encodeURIComponent(suffix)}`).header("Accept", "application/json").end(res => {
			if(res.status == 200) {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						title: "The :8ball: replied with:",
						description: `\`\`\`${res.body.magic.answer}\`\`\``
					}
				});
			} else {
				winston.error("Failed to fetch 8ball answer", {svrid: msg.channel.guild.id, chid: msg.channel.id});
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						description: "Broken 8ball 🎱😕"
					}
				});
			}
		});
	} else {
		winston.warn(`Parameters not provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} You tell me... 😜`);
	}
};
