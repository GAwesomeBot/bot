// User banned from server
module.exports = (bot, db, config, winston, svr, usr) => {
	db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
		if(!err && serverDocument) {
			if(serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.status_messages.member_banned_message.isEnabled) {
				winston.info(`Member '${usr.username}' banned from server '${svr.name}'`, {svrid: svr.id, usrid: usr.id});
				const ch = svr.channels.get(serverDocument.config.moderation.status_messages.member_banned_message.channel_id);
				if(ch) {
					const channelDocument = serverDocument.channels.id(ch.id);
					if(!channelDocument || channelDocument.bot_enabled) {
						ch.createMessage(serverDocument.config.moderation.status_messages.member_banned_message.messages.random().replaceAll("@user", `**@${usr.username}**`));
					}
				}
			}
		} else {
			winston.error("Failed to find server data for serverMemberBanned", {svrid: svr.id}, err);
		}
	});
};