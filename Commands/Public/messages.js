module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix=="me") {
		msg.channel.createMessage(`💬 You've sent ${memberDocument.messages} message${memberDocument.messages==1 ? "" : "s"} this week`);
	} else if(suffix) {
		const member = bot.memberSearch(suffix, msg.guild);
		if(member) {
			if(member.user.bot) {
				msg.channel.createMessage("I don't keep tabs on my brethren 🤖😈");
			} else {
				let targetMemberDocument = serverDocument.members.id(member.id);
				if(!targetMemberDocument) {
					serverDocument.members.push({_id: member.id});
					targetMemberDocument = serverDocument.members.id(member.id);
				}
				msg.channel.createMessage(`💬 **@${bot.getName(msg.guild, serverDocument, member)}** has sent ${targetMemberDocument.messages} message${targetMemberDocument.messages==1 ? "" : "s"} this week`);
			}
		} else {
			winston.warn(`Requested member does not exist so ${commandData.name} cannot be shown`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage("Who's that? I'd like to meet them 🤝");
		}
	} else {
		msg.channel.createMessage(serverDocument.members.sort((a, b) => {
			return b.messages - a.messages;
		}).filter(a => {
			return msg.guild.members.has(a._id);
		}).slice(0, 10).map(a => {
			return `**@${bot.getName(msg.guild, serverDocument, msg.guild.members.get(a._id))}:** ${a.messages} message${a.messages==1 ? "" : "s"} this week`;
		}).join("\n") || "*This server is literally dead (✖╭╮✖)");
	}
};
