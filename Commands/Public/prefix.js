module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix) {
		if(suffix.length > 10) {
			msg.channel.createMessage(`\`${suffix}\` is too long, don't ya think? 🐳`);
		} else {
			serverDocument.config.command_prefix = suffix;
			msg.channel.createMessage(`🐬 OK, the new prefix for this server is \`${suffix}\``);
		}
	} else {
		msg.channel.createMessage(`I am sure that you already know this... The command prefix for this server is \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}\``);
	}
};
