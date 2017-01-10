module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	let message = `**@${msg.author.username}** sent an alert in #${msg.channel.name} on ${msg.guild.name}`;
	if(suffix) {
		message += `:\`\`\`${suffix}\`\`\``;
	}
	bot.messageBotAdmins(msg.guild, serverDocument, message);
	msg.channel.createMessage("The admins have been alerted! ⚠️");
};
