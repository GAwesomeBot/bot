const ModLog = require("./../../Modules/ModerationLogging.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix) {
		msg.channel.guild.getBans().then(users => {
			let query, reason;
			if(suffix.indexOf("|")>-1 && suffix.length>3) {
				query = suffix.substring(0, suffix.indexOf("|")).trim();
				reason = suffix.substring(suffix.indexOf("|")+1).trim();
			} else {
				query = suffix;
			}
			const usr = users.find(usr => {
				return usr.username==query || usr.id==query;
			});
			if(usr) {
				msg.channel.guild.unbanMember(usr.id).then(() => {
					msg.channel.createMessage(`**@${bot.getName(msg.channel.guild, serverDocument, {user: usr}, true)}** is no longer banned 🚪`);
					ModLog.create(msg.channel.guild, serverDocument, "Unban", {user: usr}, msg.member, reason);
				}).catch(err => {
					winston.error(`Failed to unban user '${usr.username}' from server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.name, usrid: usr.id}, err);
					msg.channel.createMessage(`I couldn't unban **@${bot.getName(msg.channel.guild, serverDocument, {user: usr}, true)}** 😩`);
				});
			} else {
				msg.channel.createMessage("I couldn't find a matching banned user on this server.");
			}
		}).catch();
	} else {
		msg.channel.createMessage("Huh? Unban what?!");
	}
};
