module.exports = (bot, db, config, winston, userDocument, msg, suffix, commandData) => {
	if(suffix) {
		if(suffix==".") {
			userDocument.afk_message = null;
			msg.channel.createMessage({
				embed: {
					author: {
						name: bot.user.username,
						icon_url: bot.user.avatarURL,
						url: "https://github.com/GilbertGobbels/GAwesomeBot"
					},
					color: 0x9ECDF2,
					description: "Welcome back! 🎊\nI removed your AFK message"
				}
			});
		} else {
			userDocument.afk_message = suffix;
			msg.channel.createMessage({
				embed: {
					author: {
						name: bot.user.username,
						icon_url: bot.user.avatarURL,
						url: "https://github.com/GilbertGobbels/GAwesomeBot"
					},
					color: 0x9ECDF2,
					description: `Alright, I'll show that when someone mentions you on a server. 👌\nUse \`${commandData.name} .\` to remove it`
				}
			});
		}
		userDocument.save(err => {
			if(err) {
				winston.error("Failed to save user data for AFK message", {usrid: msg.author.id}, err);
			}
		});
	} else {
		if(userDocument.afk_message) {
			msg.channel.createMessage({
				embed: {
					author: {
						name: bot.user.username,
						icon_url: bot.user.avatarURL,
						url: "https://github.com/GilbertGobbels/GAwesomeBot"
					},
					color: 0x9ECDF2,
					description: `You have the AFK message \`${userDocument.afk_message}\` set right now 💭`
				}
			});
		} else {
			msg.channel.createMessage({
				embed: {
					author: {
						name: bot.user.username,
						icon_url: bot.user.avatarURL,
						url: "https://github.com/GilbertGobbels/GAwesomeBot"
					},
					color: 0x00FF00,
					description: "You don't have an AFK message set right now ⌨️"
				}
			});
		}
	}
};