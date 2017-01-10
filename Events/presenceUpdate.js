// User status changed (afk, new game, etc.)
module.exports = (bot, db, config, winston, member, oldpresence) => {
	if(member.id!=bot.user.id && !member.user.bot) {
		db.servers.findOne({_id: member.guild.id}, (err, serverDocument) => {
			if(!err && serverDocument) {
				if(serverDocument.config.moderation.isEnabled) {
					// Send member_online_message if necessary
					if(oldpresence.status=="offline" && member.status=="online" && serverDocument.config.moderation.status_messages.member_online_message.isEnabled) {
						winston.info(`Member '${member.user.username}' came online`, {svrid: member.guild.id, usrid: member.id});
						const ch = member.guild.channels.get(serverDocument.config.moderation.status_messages.member_online_message.channel_id);
						if(ch) {
							const channelDocument = serverDocument.channels.id(ch.id);
							if(!channelDocument || channelDocument.bot_enabled) {
								ch.createMessage(serverDocument.config.moderation.status_messages.member_online_message.messages.random().replaceAll("@user", `**@${bot.getName(member.guild, serverDocument, member)}**`).replaceAll("@mention", member.mention));
							}
						}
					}

					// Send member_streaming_message if necessary
					if(member.game && member.game.type!=0 && (!oldpresence.game || oldpresence.game.type!=1) && serverDocument.config.moderation.status_messages.member_streaming_message.isEnabled && (serverDocument.config.moderation.status_messages.member_streaming_message.enabled_user_ids.length==0 || serverDocument.config.moderation.status_messages.member_streaming_message.enabled_user_ids.indexOf(member.id)>-1)) {
						winston.info(`Member '${member.user.username}' started streaming on ${member.game.type==1 ? "Twitch" : "YouTube"}`, {svrid: member.guild.id, usrid: member.id});
						const ch = member.guild.channels.get(serverDocument.config.moderation.status_messages.member_streaming_message.channel_id);
						if(ch) {
							const channelDocument = serverDocument.channels.id(ch.id);
							if(!channelDocument || channelDocument.bot_enabled) {
								ch.createMessage(`:video_game: **@${bot.getName(member.guild, serverDocument, member)}** is streaming: ${member.game.url}`);
							}
						}
					}

					// Send member_game_updated_message if necessary
					if(bot.getGame(oldpresence)!=bot.getGame(member) && serverDocument.config.moderation.status_messages.member_game_updated_message.isEnabled) {
						winston.info(`Member '${member.user.username}' started playing '${bot.getGame(member)}`, {svrid: member.guild.id, usrid: member.id});
						const ch = member.guild.channels.get(serverDocument.config.moderation.status_messages.member_game_updated_message.channel_id);
						if(ch) {
							const channelDocument = serverDocument.channels.id(ch.id);
							if(!channelDocument || channelDocument.bot_enabled) {
								ch.createMessage(`**@${bot.getName(member.guild, serverDocument, member)}** is now playing \`${bot.getGame(member)}\``);
							}
						}
					}

					// Send member_offline_message if necessary
					if(oldpresence.status=="online" && member.status=="offline" && serverDocument.config.moderation.status_messages.member_offline_message.isEnabled) {
						winston.info(`Member '${member.user.username}' went offline`, {svrid: member.guild.id, usrid: member.id});
						const ch = member.guild.channels.get(serverDocument.config.moderation.status_messages.member_offline_message.channel_id);
						if(ch) {
							const channelDocument = serverDocument.channels.id(ch.id);
							if(!channelDocument || channelDocument.bot_enabled) {
								ch.createMessage(serverDocument.config.moderation.status_messages.member_offline_message.messages.random().replaceAll("@user", `**@${bot.getName(member.guild, serverDocument, member)}**`).replaceAll("@mention", member.mention));
							}
						}
					}
				}
			} else {
				winston.error("Failed to find server data for presenceUpdate", {svrid: member.guild.id}, err);
			}
		});

		// Add last seen time to profile
		if(oldpresence.status=="online" && member.status!="offline") {
			db.users.findOrCreate({_id: member.id}, (err, userDocument) => {
				if(!err && userDocument) {
					userDocument.last_seen = Date.now();

					// Save changes to userDocument
					userDocument.save(err => {
						if(err) {
							winston.error("Failed to save user data for last seen", {usrid: member.id}, err);
						}
					});
				} else {
					winston.error("Failed to find or create user data for last seen", {usrid: member.id}, err);
				}
			});
		}
	}
};
