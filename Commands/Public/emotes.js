module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	const info = msg.guild.emojis.map(emoji => {
		return `<:${emoji.name}:${emoji.id}> ${emoji.name}`;
	});
	let embed_fields = [];
	msg.guild.emojis.map(emoji => {
		embed_fields.push({
			name: `${emoji.name}`,
			value: `<:${emoji.name}:${emoji.id}>`,
			inline: true
		});
	});
	if(info.length > 0) {
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x00FF00,
				title: `**${info.length} custom emote${info.length == 1 ? "" : "s"} on this server:**`,
				fields: embed_fields
			}
		});
	} else {
		msg.channel.createMessage("There aren't any custom emotes on this server. 🌋");
	}
};