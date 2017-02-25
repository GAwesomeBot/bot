// Message deleted
module.exports = (bot, db, config, winston, msg) => {
	if(msg && msg.channel.guild && msg.author.id!=bot.user.id && !msg.author.bot) {
		// Get server data
		db.servers.findOne({_id: msg.channel.guild.id}, (err, serverDocument) => {
			if(!err && serverDocument) {
				// Get channel data
				let channelDocument = serverDocument.channels.id(msg.channel.id);
				// Create channel data if not found
				if(!channelDocument) {
					serverDocument.channels.push({_id: msg.channel.id});
					channelDocument = serverDocument.channels.id(msg.channel.id);
				}

				// Decrement today's message count for server
				serverDocument.messages_today--;
				// Count server stats if enabled in this channel
				if(channelDocument.isStatsEnabled) {
					// Decrement this week's message count for member
					const memberDocument = serverDocument.members.id(msg.author.id);
					if(memberDocument && memberDocument.messages>0 && msg.timestamp>serverDocument.stats_timestamp) {
						memberDocument.messages--;

						// Save changes to serverDocument
						serverDocument.save(err => {
							if(err) {
								winston.error("Failed to save server data for messageDeleted", {svrid: msg.channel.guild.id}, err);
							}
						});
					}
				}

				// Undo vote based on previous message if necessary
				for(let i=0; i<config.vote_triggers.length; i++) {
					if((` ${msg.content}`).indexOf(config.vote_triggers[i])==0) {
						// Get previous message
						bot.getMessages(msg.channel.id, 1, msg.id).then(messages => {
							if(messages[0] && [bot.user.id, msg.author.id].indexOf(messages[0].author.id)==-1 && !messages[0].author.bot) {
								// Get target user data
								db.users.findOrCreate({_id: messages[0].author.id}, (err, targetUserDocument) => {
									if(!err && targetUserDocument) {
										// Increment points
										targetUserDocument.points--;

										// Save changes to targetUserDocument
										targetUserDocument.save(err => {
											if(err) {
												winston.error("Failed to save user data for points", {usrid: msg.author.id}, err);
											}
										});
									}
								});
							}
						}).catch();
						break;
					}
				}

				// Send message_deleted_message if necessary
				if(serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.status_messages.message_deleted_message.isEnabled && serverDocument.config.moderation.status_messages.message_deleted_message.enabled_channel_ids.indexOf(msg.channel.id)>-1 && !channelDocument.isMessageDeletedDisabled) {
					winston.info(`Message by member '${msg.author.username}' on server '${msg.channel.guild.name}' deleted`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});

					// Send message in different channel
					if(serverDocument.config.moderation.status_messages.message_deleted_message.type=="single" && serverDocument.config.moderation.status_messages.message_deleted_message.channel_id) {
						const ch = msg.channel.guild.channels.get(serverDocument.config.moderation.status_messages.message_deleted_message.channel_id);
						if(ch) {
							const targetChannelDocument = serverDocument.channels.id(ch.id);
							if(!targetChannelDocument || targetChannelDocument.bot_enabled) {
								ch.createMessage(`Message by **@${bot.getName(msg.channel.guild, serverDocument, msg.member)}** in #${msg.channel.name} deleted:\n\`\`\`${msg.cleanContent}\`\`\``, {disable_everyone: true});
							}
						}
					// Send message in same channel
					} else if(serverDocument.config.moderation.status_messages.message_deleted_message.type=="msg") {
						if(!channelDocument || channelDocument.bot_enabled) {
							msg.channel.createMessage(`Message by **@${bot.getName(msg.channel.guild, serverDocument, msg.member)}** deleted:\n\`\`\`${msg.cleanContent}\`\`\``, {disable_everyone: true});
						}
					}
				}
			} else {
				winston.error("Failed to find server data for messageDeleted", {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
			}
		});
	}
};
