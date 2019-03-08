module.exports = async ({ Constants: { Colors } }, { memberDocument, memberQueryDocument }, msg, commandData) => {
	if (msg.suffix) {
		if (msg.suffix === ".") {
			memberQueryDocument.set("afk_message", null);
			msg.send({
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
			memberQueryDocument.set("afk_message", msg.suffix);
			msg.send({
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
		msg.send({
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
		msg.send({
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
