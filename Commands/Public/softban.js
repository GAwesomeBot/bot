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
			member.ban().then(() => {
				msg.channel.createMessage(`Bye-bye **@${bot.getName(msg.channel.guild, serverDocument, member)}** 🔨`);
				ModLog.create(msg.channel.guild, serverDocument, "Softban", member, msg.member, reason);
			}).catch(err => {
				winston.error(`Failed to softban member '${member.user.username}' from server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.name, usrid: member.id}, err);
				msg.channel.createMessage(`I couldn't softban **@${bot.getName(msg.channel.guild, serverDocument, member)}** 😂`);
			});
		} else {
			msg.channel.createMessage("I couldn't find a matching member on this server.");
		}
	} else {
		msg.channel.createMessage("Do you want me to softban you? 😮");
	}
};
