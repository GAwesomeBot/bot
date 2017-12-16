module.exports = async ({ bot }, { serverDocument }, msg, commandData) => {
	if (!msg.suffix) {
		msg.channel.send({
			embed: {
				color: 0xCC0F16,
				description: `You need to provide a message for this alert!`,
			},
		});
	} else {
		const embedObj = {
			embed: {
				color: 0xE55B0A,
				title: `Alert from ${msg.author.tag}`,
				description: `In #${msg.channel.name} (${msg.channel}) on **${msg.guild}**\n\`\`\`\n${msg.suffix}\`\`\``,
				thumbnail: {
					url: msg.author.displayAvatarURL(),
				},
			},
		};
		bot.messageBotAdmins(msg.guild, serverDocument, embedObj);
		msg.channel.send({
			embed: {
				color: 0x43B581,
				description: `I've alerted the admins about it! ⚠️`,
			},
		});
	}
};
