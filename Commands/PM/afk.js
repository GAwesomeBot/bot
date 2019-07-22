module.exports = async ({ Constants: { Colors } }, msg, commandData) => {
	if (msg.suffix) {
		if (msg.suffix === ".") {
			msg.author.userDocument.query.set("afk_message", null);
			msg.send({
				embed: {
					color: Colors.GREEN,
					title: `Welcome back! 🎊`,
					description: `I removed your global AFK message.`,
					footer: {
						text: `You can set a new one by running "${commandData.name} <message>"`,
					},
				},
			});
		} else {
			msg.author.userDocument.query.set("afk_message", msg.suffix);
			msg.send({
				embed: {
					color: Colors.GREEN,
					description: `Alright, I'll show that when someone mentions you on a server. 👌`,
					footer: {
						text: `Use "${commandData.name} ." to remove it`,
					},
				},
			});
		}
		await msg.author.userDocument.save().catch(err => {
			logger.verbose(`Failed to save user document for AFK message >.>\n`, err);
		});
	} else if (msg.author.userDocument.afk_message) {
		msg.send({
			embed: {
				color: Colors.BLUE,
				title: `Your current global AFK message is:`,
				description: `${msg.author.userDocument.afk_message}`,
				footer: {
					text: `Use "${commandData.name} <message>" to change it or "${commandData.name} ." to remove it.`,
				},
			},
		});
	} else {
		msg.send({
			embed: {
				color: Colors.LIGHT_RED,
				description: `You don't have a global AFK message set right now! ⌨️`,
				footer: {
					text: `You can set one by running "${commandData.name} <message>"`,
				},
			},
		});
	}
};
