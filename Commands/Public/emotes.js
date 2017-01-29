module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	let embed_fields = [];
	msg.guild.emojis.map(emoji => {
		embed_fields.push({
			name: `${emoji.name}`,
			value: `<:${emoji.name}:${emoji.id}>`,
			inline: true
		});
	});
	let footer_warning = "";
	if (embed_fields.length > 25)
		footer_warning = "There are more than 25 custom emotes. The bot can only show the first 25.";
	if(embed_fields.length > 0) {
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x00FF00,
				title: `**${embed_fields.length} custom emote${embed_fields.length == 1 ? "" : "s"} on this server:**`,
				fields: embed_fields,
				footer: {
                	text: footer_warning
				}
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