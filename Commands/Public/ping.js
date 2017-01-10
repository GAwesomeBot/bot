const moment = require("moment");

// Check if the bot is alive and well
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	let info = `🏓 **${msg.guild.members.get(bot.user.id).nick || bot.user.username}** v${config.version} by BitQuote running for ${moment.duration(process.uptime(), "seconds").humanize()}. Serving ${bot.users.size} user${bot.users.size==1 ? "" : "s"} in ${bot.guilds.size} server${bot.guilds.size==1 ? "" : "s"}`;
	if(config.hosting_url) {
		info += `. Info: <${config.hosting_url}>`;
	}
	msg.channel.createMessage(info);
};
