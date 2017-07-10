const moment = require("moment");

// Check if the bot is alive and well
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	let info = `🏓 **${msg.channel.guild.members.get(bot.user.id).nick || bot.user.username}** v${config.version} by GG142 aka Gilbert running for ${moment.duration(process.uptime(), "seconds").humanize()}. Serving ${bot.users.size} user${bot.users.size==1 ? "" : "s"} in ${bot.guilds.size} server${bot.guilds.size==1 ? "" : "s"}`;
	if(config.hosting_url) {
		info += `. Info [here](${config.hosting_url})`;
	}
	msg.channel.createMessage({
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
