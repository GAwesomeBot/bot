// User updated (name, avatar, etc.)
module.exports = (bot, db, config, winston, usr, oldusrdata) => {
	if(usr.id!=bot.user.id && !usr.bot) {
		// Do this for each server the user is on
		const doUpdate = svr => {
			db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
				if(!err && serverDocument) {
					if(serverDocument.config.moderation.isEnabled) {
						const member = svr.members.get(usr.id);

						// Send member_username_updated_message if necessary
						if(oldusrdata.username!=usr.username && oldusrdata.username && usr.username && serverDocument.config.moderation.status_messages.member_username_updated_message.isEnabled) {
							winston.info(`Member '${oldusrdata.username}' changed username to '${usr.username}'`, {svrid: svr.id, usrid: usr.id});
							const ch = svr.channels.get(serverDocument.config.moderation.status_messages.member_username_updated_message.channel_id);
							if(ch) {
								const channelDocument = serverDocument.channels.id(ch.id);
								if(!channelDocument || channelDocument.bot_enabled) {
									ch.createMessage(`**@${bot.getName(svr, serverDocument, {
										user: oldusrdata
									}, true)}** is now **@${bot.getName(svr, serverDocument, member, true)}**`);
								}
							}
						}

						// Send member_avatar_updated_message if necessary
						if(oldusrdata.avatar!=usr.avatar && serverDocument.config.moderation.status_messages.member_avatar_updated_message.isEnabled) {
							winston.info(`Member '${usr.username}' changed avatar from '${oldusrdata.avatar}' to '${usr.avatar}'`, {svrid: svr.id, usrid: usr.id});
							const ch = svr.channels.get(serverDocument.config.moderation.status_messages.member_avatar_updated_message.channel_id);
							if(ch) {
								const channelDocument = serverDocument.channels.id(ch.id);
								if(!channelDocument || channelDocument.bot_enabled) {
									ch.createMessage(`**@${bot.getName(svr, serverDocument, member)}** changed their avatar from ${oldusrdata.avatar ? (`https://cdn.discordapp.com/avatars/${usr.id}/${oldusrdata.avatar}.jpg`) : "the default one"} to ${member.avatarURL || "the default one"}`);
								}
							}
						}
					}
				} else {
					winston.error("Failed to find server data for userUpdate", {svrid: svr.id}, err);
				}
			});
		};

		// Iterate through all mutual servers with user
		bot.guilds.forEach(svr => {
			if(svr.members.has(usr.id)) {
				doUpdate(svr);
			}
		});

		// Add old username to past names in profile
		if(oldusrdata.username!=usr.username && oldusrdata.username && usr.username) {
			db.users.findOrCreate({_id: usr.id}, (err, userDocument) => {
				if(!err && userDocument) {
					if(userDocument.past_names.indexOf(oldusrdata.username)==-1) {
						if(userDocument.past_names.length>3) {
							userDocument.past_names = [];
						}
						userDocument.past_names.push(oldusrdata.username);

						// Save changes to userDocument
						userDocument.save(err => {
							if(err) {
								winston.error("Failed to save user data for past names", {usrid: usr.id}, err);
							}
						});
					}
				} else {
					winston.error("Failed to find or create user data for past names", {usrid: usr.id}, err);
				}
			});
		}
	}
};
