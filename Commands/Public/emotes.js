module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	const info = msg.guild.emojis.map(emoji => {
		return `<:${emoji.name}:${emoji.id}> ${emoji.name}`;
	});
	if(info.length>0) {
		msg.channel.createMessage(`**${info.length} custom emote${info.length==1 ? "" : "s"} on this server:**\n\t${info.join("\n\t")}`);
	} else {
		msg.channel.createMessage("There aren't any custom emotes on this server. 🌋");
	}
};