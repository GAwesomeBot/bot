module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix && ["bug", "suggestion", "feature", "issue"].indexOf(suffix.toLowerCase())>-1) {
		msg.channel.createMessage(`🐜 Please file your ${suffix.toLowerCase()} here: https://github.com/GilbertGobbels/GAwesomeBot/issues/new`);
	} else {
		msg.channel.createMessage(`Hello! I'm GAwesomeBot, the best discord bot! 🐬 Use \`${bot.getCommandPrefix(msg.guild, serverDocument)}help\` to list commands. Developed by Gilbert, based off AB by BitQuote. Built on NodeJS with Eris. Go to <https://bot.gilbertgobbels.xyz:8008/> to learn more, or join our Discord server: <${config.discord_link}>`);
	}
};
