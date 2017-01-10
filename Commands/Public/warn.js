const ModLog = require("./../../Modules/ModerationLogging.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix) {
		let member, reason;
		if(suffix.indexOf("|")>-1 && suffix.length>3) {
			member = bot.memberSearch(suffix.substring(0, suffix.indexOf("|")).trim(), msg.guild);
			reason = suffix.substring(suffix.indexOf("|")+1).trim();
		} else {
			member = bot.memberSearch(suffix, msg.guild);
		}

		if(member) {
			if(member.user.bot || [msg.author.id, bot.user.id].indexOf(member.id)>-1 || bot.getUserBotAdmin(msg.guild, serverDocument, member)>0) {
				msg.channel.createMessage(`Sorry, I can't warn/strike **@${bot.getName(msg.guild, serverDocument, member)}** for some reason ✋`);
			} else {
				let targetMemberDocument = serverDocument.members.id(member.id);
				if(!targetMemberDocument) {
					serverDocument.members.push({_id: member.id});
					targetMemberDocument = serverDocument.members.id(member.id);
				}

				targetMemberDocument.strikes.push({
					_id: msg.author.id,
					reason: reason || "No reason"
				});

				member.user.getDMChannel().then(ch => {
					ch.createMessage(`Mod warning from **@${bot.getName(msg.guild, serverDocument, member, true)}** on **${msg.guild.name}**${reason ? (`: \`\`\`${reason}\`\`\``) : ""}`);
					msg.channel.createMessage(`Ok, **@${bot.getName(msg.guild, serverDocument, member)}** now has ${targetMemberDocument.strikes.length} strike${targetMemberDocument.strikes.length==1 ? "" : "s"} 🚦 I warned them via PM ⚠️`);
					ModLog.create(msg.guild, serverDocument, "Warning", member, msg.member, reason);
				}).catch();
			}
		} else {
			msg.channel.createMessage("I couldn't find a matching member on this server.");
		}
	} else {
		msg.channel.createMessage("Who do you want me to warn? 😮 What should I warn them about?");
	}
};
