const moment = require("moment");

// Check if the bot is alive and well
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	let info = `🏓 **${bot.user.username} by GG14 serving ${bot.users.size} users and ${bot.guilds.size} servers.**`;
	if(config.hosting_url) {
		info += `. Info [here](${config.hosting_url})`;
	}
	msg.channel.send({
		embed: {
            author: {
                name: bot.user.username,
                icon_url: bot.user.avatarURL,
                url: "https://github.com/GilbertGobbels/GAwesomeBot"
            },
            color: 0x00FF00,
			description: info
		}
	});
};
