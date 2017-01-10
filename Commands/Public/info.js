const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	const info = [
		`__**${msg.guild.name}**__`,
		`🆔 ${msg.guild.id}`,
		`🗓 Created ${moment(msg.guild.createdAt).fromNow()}`,
		`👑 Owned by @${bot.getName(msg.guild, serverDocument, msg.guild.members.get(msg.guild.ownerID))}`,
		`👥 ${msg.guild.members.size} members`
	];
	if(msg.guild.iconURL) {
		info.push(`🖼 Icon: ${msg.guild.iconURL}`);
	}
	info.push(
		`🕯 Command Prefix: \`${bot.getCommandPrefix(msg.guild, serverDocument)}\``,
		`💬 ${serverDocument.messages_today} message${serverDocument.messages_today==1 ? "" : "s"} today`,
		`🗄 Category: ${serverDocument.config.public_data.server_listing.category}`,
		`🌎 <${config.hosting_url}activity/servers?q=${encodeURIComponent(msg.guild.name)}>`
    );
	msg.channel.createMessage(info.join("\n"));
};
