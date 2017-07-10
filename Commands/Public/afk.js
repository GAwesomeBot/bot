module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		if(suffix === ".") {
			memberDocument.afk_message = null;
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
			memberDocument.afk_message = suffix;
			msg.channel.createMessage({
				embed: {
					author: {
						name: bot.user.username,
						icon_url: bot.user.avatarURL,
						url: "https://github.com/GilbertGobbels/GAwesomeBot"
					},
					color: 0x9ECDF2,
					description: `Alright, I'll show that when someone mentions you on this server. 👌\nUse \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} .\` to remove it`
				}
			});
		}
	} else {
		if(memberDocument.afk_message) {
			msg.channel.createMessage({
				embed: {
					author: {
						name: bot.user.username,
						icon_url: bot.user.avatarURL,
						url: "https://github.com/GilbertGobbels/GAwesomeBot"
					},
					color: 0x9ECDF2,
					description: `You have the AFK message \`${memberDocument.afk_message}\` set on this server 💭`
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
					description: "You don't have an AFK message set on this server ⌨"
				}
			});
		}
	}
};
