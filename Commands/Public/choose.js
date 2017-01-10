module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const choices = suffix.split("|");
	if(suffix && choices.length>=2) {
		msg.channel.createMessage(choices.random());
	} else {
		winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} 🤔 I didn't quite get that. Make sure to use the syntax \`${bot.getCommandPrefix(msg.guild, serverDocument)}${commandData.name} ${commandData.usage}\``);
	}
};