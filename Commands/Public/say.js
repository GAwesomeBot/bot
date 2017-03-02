module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let text = "🙊";
	if(suffix) {
		text = msg.cleanContent.slice(bot.getCommandPrefix(msg.channel.guild, serverDocument).length + commandData.name.length);
	}
	msg.channel.createMessage({
		content: text,
		disableEveryone: true
	});
};