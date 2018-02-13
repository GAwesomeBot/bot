module.exports = async ({ client, Constants: { Colors } }, { serverDocument }, msg, commandData) => {
	if (!msg.suffix) {
		msg.send({
			embed: {
				color: Colors.RED,
				description: `You need to provide a message for this alert!`,
			},
		});
	} else {
		const embedObj = {
			embed: {
				color: Colors.LIGHT_ORANGE,
				title: `Alert from ${msg.author.tag}`,
				description: `In #${msg.channel.name} (${msg.channel}) on **${msg.guild}**\n\`\`\`\n${msg.suffix}\`\`\``,
				thumbnail: {
					url: msg.author.displayAvatarURL(),
				},
			},
		};
		client.messageBotAdmins(msg.guild, serverDocument, embedObj);
		msg.send({
			embed: {
				color: Colors.LIGHT_GREEN,
				description: `I've alerted the admins about it! ⚠️`,
			},
		});
	}
};
