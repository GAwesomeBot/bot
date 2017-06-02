const ModLog = require("./../../Modules/ModerationLogging.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix) {
		let member, reason;
		if(suffix.indexOf("|")>-1 && suffix.length>3) {
			member = bot.memberSearch(suffix.substring(0, suffix.indexOf("|")).trim(), msg.channel.guild);
			reason = suffix.substring(suffix.indexOf("|")+1).trim();
		} else {
			member = bot.memberSearch(suffix, msg.channel.guild);
		}

		if(member) {
			if(bot.isMuted(msg.channel, member)) {
				bot.unmuteMember(msg.channel, member, err => {
					if(err) {
						winston.error(`Failed to unmute member '${member.user.username}' in channel '${msg.channel.name}' from server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.name, usrid: member.id}, err);
						msg.channel.createMessage(`I couldn't unmute **@${bot.getName(msg.channel.guild, serverDocument, member)}** in this channel 😴`);
					} else {
						msg.channel.createMessage(`**@${bot.getName(msg.channel.guild, serverDocument, member)}** can speak in #${msg.channel.name} now 🔈`);
						ModLog.create(msg.channel.guild, serverDocument, "Unmute", member, msg.member, reason);
					}
				});
			} else {
				msg.channel.createMessage(`**@${bot.getName(msg.channel.guild, serverDocument, member)}** isn't muted, so I can't unmute them! 🤓`);
			}
		} else {
			msg.channel.createMessage("I couldn't find a matching member on this server.");
		}
	} else {
		msg.channel.createMessage("Huh? You're not muted! 😮");
	}
};
