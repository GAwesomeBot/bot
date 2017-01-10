const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		const member = suffix.toLowerCase()=="me" ? msg.member : bot.memberSearch(suffix, msg.guild);
		if(member) {
			const targetMemberDocument = serverDocument.members.id(member.id);
			const info = (targetMemberDocument ? targetMemberDocument.strikes : []).map(strikeDocument => {
				const creator = msg.guild.members.get(strikeDocument._id);
				return `${strikeDocument.reason} - ${moment(strikeDocument.timestamp).fromNow()} from @${creator ? bot.getName(msg.guild, serverDocument, creator) : "invalid-user"}`;
			});
			msg.channel.createMessage(info.join("\n") || (`✅ **@${bot.getName(msg.guild, serverDocument, member)}** doesn't have any strikes`));
		} else {
			winston.warn(`Requested member does not exist so ${commandData.name} cannot be shown`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage(`I don't know who ${suffix} is! 😦`);
		}
	} else {
		const info = serverDocument.members.filter(a => {
			const member = msg.guild.members.get(a._id);
			return member && bot.getUserBotAdmin(msg.guild, serverDocument, member)<1 && a.strikes.length>0;
		}).map(a => {
			return `@${bot.getName(msg.guild, serverDocument, msg.guild.members.get(a._id))}: ${a.strikes.length} strike${a.strikes.length==1 ? "" : "s"}`;
		});
		msg.channel.createMessage(info.join("\n") || "Everyone on this server is perfect 😁");
	}
};
