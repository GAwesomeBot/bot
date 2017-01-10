// Member joined server
module.exports = (bot, db, config, winston, svr, member) => {
	// Get server data
	db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
		if(!err && serverDocument) {
			if(serverDocument.config.moderation.isEnabled) {
				// Send new_member_message if necessary
				if(serverDocument.config.moderation.status_messages.new_member_message.isEnabled) {
					winston.info(`Member '${member.user.username}' joined server '${svr.name}'`, {svrid: svr.id, usrid: member.id});
					const ch = svr.channels.get(serverDocument.config.moderation.status_messages.new_member_message.channel_id);
					if(ch) {
						const channelDocument = serverDocument.channels.id(ch.id);
						if(!channelDocument || channelDocument.bot_enabled) {
							ch.createMessage(serverDocument.config.moderation.status_messages.new_member_message.messages.random().replaceAll("@user", `**@${bot.getName(svr, serverDocument, member)}**`).replaceAll("@mention", member.mention));
						}
					}
				}

				// Send new_member_pm if necessary
				if(serverDocument.config.moderation.status_messages.new_member_pm.isEnabled && !member.user.bot) {
					member.user.getDMChannel().then(ch =>{
						ch.createMessage(`Welcome to the ${svr.name} Discord chat! ${serverDocument.config.moderation.status_messages.new_member_pm.message_content} I'm ${bot.getName(svr, serverDocument, svr.members.get(bot.user.id))} by the way. Learn more with \`${bot.getCommandPrefix(svr, serverDocument)}help\` in the public chat.`);
					});
				}

				// Add member to new_member_roles
				for(let i=0; i<serverDocument.config.moderation.new_member_roles.length; i++) {
					const role = svr.roles.get(serverDocument.config.moderation.new_member_roles[i]);
					if(role) {
						member.roles.push(role.id);
						member.edit({
							roles: member.roles
						}).then().catch(err => {
							winston.error("Failed to add new member to role", {svrid: svr.id, usrid: member.id, roleid: role.id}, err);
						});
					}
				}
			}
		} else {
			winston.error("Failed to find server data for serverNewMember", {svrid: svr.id}, err);
		}
	});
};
