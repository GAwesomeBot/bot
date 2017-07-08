module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	const emojis = msg.channel.guild.emojis.map(emoji => `<:${emoji.name}:${emoji.id}>: ${emoji.name}`);
	if (msg.channel.guild.emojis.length > 0) {
		msg.channel.createMessage({
			embed: {
				color: 0x00FF00,
				title: `**${msg.channel.guild.emojis.length} custom emote${msg.channel.guild.emojis.length === 1 ? "" : "s"} on this server:**`,
				description: emojis.join("\n"),
			},
		});
	} else {
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: "There aren't any custom emotes on this server. 🌋",
			},
		});
	}
};
