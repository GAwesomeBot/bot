module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const choices = suffix.split("|");
	if (suffix && choices.length >= 2) {
		msg.channel.createMessage({
			embed: {
				color: 0x00FF00,
				title: "I choose:",
				description: `\`\`\`${choices.random()}\`\`\``,
				footer: {
					text: `This was a random choice from ${choices.length} options`,
				},
			},
		});
	} else {
		// eslint-disable-next-line
		winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `I didn't quite get that. 🤔`,
				footer: {
					text: `Make sure to use the syntax "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}"`,
				},
			},
		});
	}
};
