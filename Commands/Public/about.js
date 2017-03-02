module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix && ["bug", "suggestion", "feature", "issue", "request"].indexOf(suffix.toLowerCase())>-1) {
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x9ECDF2,
				description: `🐜 Please file your ${suffix.toLowerCase()} [here](https://github.com/GilbertGobbels/GAwesomeBot/issues)`
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
                color: 0x9ECDF2,
				description: `Hello! I'm ${bot.user.username}, the best discord bot! 🐬 Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}help\` to list all the commands.\n
				Created by GG142, aka Gilbert. Built on NodeJS and Eris. Go [here](${config.hosting_url}) to learn more, or join our Discord server [here](${config.discord_link})`
			}
		});
	}
};
