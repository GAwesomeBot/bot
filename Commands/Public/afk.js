module.exports = async (main, documents, msg, commandData) => {
	const { memberDocument } = documents;
	if (msg.suffix) {
		if (msg.suffix === ".") {
			memberDocument.afk_message = null;
			msg.channel.send({
				embed: {
					color: 0x00FF00,
					title: `Welcome back! 🎊`,
					description: `I removed your AFK message in this server.`,
					footer: {
						text: `You can set a new one by running "${msg.guild.commandPrefix}${commandData.name} <message>"`,
					},
				},
			});
		} else {
			memberDocument.afk_message = msg.suffix;
			msg.channel.send({
				embed: {
					color: 0x00FF00,
					description: `Alright, I'll show that when someone mentions you on this server. 👌`,
					footer: {
						text: `Use "${msg.guild.commandPrefix}${commandData.name} ." to remove it`,
					},
				},
			});
		}
	} else if (memberDocument.afk_message) {
		msg.channel.send({
			embed: {
				color: 0x3669FA,
				description: `Your current AFK message is: \`\`\`\n${memberDocument.afk_message.replace(/```/g, "")}\`\`\``,
				footer: {
					text: `Use "${msg.guild.commandPrefix}${commandData.name} <message>" to change it or "${msg.guild.commandPrefix}${commandData.name} ." to remove it.`,
				},
			},
		});
	} else {
		msg.channel.send({
			embed: {
				color: 0xFF0000,
				description: `You don't have an AFK message set right now! ⌨`,
				footer: {
					text: `You can set one by running "${msg.guild.commandPrefix}${commandData.name} <message>"`,
				},
			},
		});
	}
};
