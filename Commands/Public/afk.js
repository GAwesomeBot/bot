module.exports = async ({ Constants: { Colors } }, documents, msg, commandData) => {
	const { memberDocument } = documents;
	if (msg.suffix) {
		if (msg.suffix === ".") {
			memberDocument.afk_message = null;
			msg.channel.send({
				embed: {
					color: Colors.GREEN,
					title: `Welcome back! 🎊`,
					description: `I removed your AFK message in this server.`,
					footer: {
						text: `You can set a new one by using "${msg.guild.commandPrefix}${commandData.name} <message>"`,
					},
				},
			});
		} else {
			memberDocument.afk_message = msg.suffix;
			msg.channel.send({
				embed: {
					color: Colors.GREEN,
					description: `Alright, I will now show that message when you are mentioned in chat. 👌`,
					footer: {
						text: `Use "${msg.guild.commandPrefix}${commandData.name} ." to remove it`,
					},
				},
			});
		}
	} else if (memberDocument.afk_message) {
		msg.channel.send({
			embed: {
				color: Colors.BLUE,
				title: `Your current AFK message is:`,
				description: `${memberDocument.afk_message}`,
				footer: {
					text: `Use "${msg.guild.commandPrefix}${commandData.name} <message>" to change it or "${msg.guild.commandPrefix}${commandData.name} ." to remove it.`,
				},
			},
		});
	} else {
		msg.channel.send({
			embed: {
				color: Colors.LIGHT_RED,
				description: `You don't have an AFK message set right now! ⌨`,
				footer: {
					text: `You can set one by using "${msg.guild.commandPrefix}${commandData.name} <message>"`,
				},
			},
		});
	}
};
