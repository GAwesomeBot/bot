module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	if(msg.guild.emojis.length > 0) {
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x00FF00,
				title: `**${msg.guild.emojis.length} custom emote${msg.guild.emojis.length == 1 ? "" : "s"} on this server:**`,
				description: msg.guild.emojis.map(emoji => {
								return `<:${emoji.name}:${emoji.id}>: ${emoji.name}`;
							}).join(`\n`)
			}
		});
	} else {
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0xFF0000,
				description: "There aren't any custom emotes on this server. 🌋"
			}
		});
	}
};