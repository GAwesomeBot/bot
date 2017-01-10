module.exports = (bot, db, config, winston, userDocument, msg, suffix, commandData) => {
	if(suffix) {
		if(suffix==".") {
			userDocument.afk_message = null;
			msg.channel.createMessage("Welcome back! 🎊 I removed your AFK message");
		} else {
			userDocument.afk_message = suffix;
			msg.channel.createMessage(`Alright, I'll show that when someone mentions you on a server. 👌 Use \`${commandData.name} .\` to remove it`);
		}
		userDocument.save(err => {
			if(err) {
				winston.error("Failed to save user data for AFK message", {usrid: msg.author.id}, err);
			}
		});
	} else {
		if(userDocument.afk_message) {
			msg.channel.createMessage(`You have the AFK message \`${userDocument.afk_message}\` set right now 💭`);
		} else {
			msg.channel.createMessage("You don't have an AFK message set right now ⌨️");
		}
	}
};