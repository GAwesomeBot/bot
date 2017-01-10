// User details updated on server (role, nick, etc.)
module.exports = (bot, db, config, winston, svr, member, oldmemberdata) => {
	db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
		if(!err && serverDocument) {
			// Send member_nick_updated_message if necessary
			if(serverDocument.config.moderation.status_messages.member_nick_updated_message.isEnabled) {
				const ch = svr.channels.get(serverDocument.config.moderation.status_messages.member_nick_updated_message.channel_id);
				if(ch) {
					const channelDocument = serverDocument.channels.id(ch.id);
					if(!channelDocument || channelDocument.bot_enabled) {
						// Nickname added
						if(oldmemberdata.nick!=member.nick && !oldmemberdata.nick && member.nick) {
							ch.createMessage({
								content: `**@${bot.getName(svr, serverDocument, member)}** got a nick: \`${member.nick}\``,
								disableEveryone: true
							});
						}

						// Nickname changed
						if(oldmemberdata.nick!=member.nick && oldmemberdata.nick && member.nick) {
							ch.createMessage({
								content: `**@${bot.getName(svr, serverDocument, member)}** changed their nick from \`${oldmemberdata.nick}\` to \`${member.nick}\``,
								disableEveryone: true
							});
						}

						// Nickname removed
						if(oldmemberdata.nick!=member.nick && oldmemberdata.nick && !member.nick) {
							ch.createMessage({
								content: `**@${bot.getName(svr, serverDocument, member)}** removed their nick (\`${oldmemberdata.nick}\`)`,
								disableEveryone: true
							});
						}
					}
				}
			}	
		} else {
			winston.error("Failed to find server data for serverMemberUpdated", {svrid: svr.id}, err);
		}
	});
};