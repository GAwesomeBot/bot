// Server channel deleted
module.exports = (bot, db, config, winston, ch) => {
	if(ch.guild) {
		db.servers.findOne({_id: ch.guild.id}, (err, serverDocument) => {
			if(!err && serverDocument) {
				// Remove channel from config (replace with default channel) if necessary
				let updated = false;
				const channelDocument = serverDocument.channels.id(ch.id);
				if(channelDocument) {
					updated = true;
					channelDocument.remove();
				}
				for(const command in serverDocument.toObject().config.commands) {
					if(serverDocument.config.commands[command] && serverDocument.config.commands[command].disabled_channel_ids && serverDocument.config.commands[command].disabled_channel_ids.indexOf(ch.id)>-1) {
						updated = true;
						serverDocument.config.commands[command].disabled_channel_ids.splice(serverDocument.config.commands[command].disabled_channel_ids.indexOf(ch.id), 1);
					}
				}
				if(serverDocument.config.message_of_the_day.channel_id==ch.id) {
					updated = true;
					serverDocument.config.message_of_the_day.channel_id = ch.guild.defaultChannel.id;
				}
				for(const filter in serverDocument.toObject().config.moderation.filters) {
					if(serverDocument.config.moderation.filters[filter].enabled_channel_ids && serverDocument.config.moderation.filters[filter].enabled_channel_ids.indexOf(ch.id)>-1) {
						updated = true;
						serverDocument.config.moderation.filters[filter].enabled_channel_ids.splice(serverDocument.config.moderation.filters[filter].enabled_channel_ids.indexOf(ch.id), 1);
					}
				}
				for(const status_message in serverDocument.toObject().config.moderation.status_messages) {
					if(serverDocument.config.moderation.status_messages[status_message].enabled_channel_ids && serverDocument.config.moderation.status_messages[status_message].enabled_channel_ids.indexOf(ch.id)>-1) {
						updated = true;
						serverDocument.config.moderation.status_messages[status_message].enabled_channel_ids.splice(serverDocument.config.moderation.status_messages[status_message].enabled_channel_ids.indexOf(ch.id), 1);
						if(serverDocument.config.moderation.status_messages[status_message].enabled_channel_ids.length==0) {
							serverDocument.config.moderation.status_messages[status_message].enabled_channel_ids = [ch.guild.defaultChannel.id];
						}
					} else if(serverDocument.config.moderation.status_messages[status_message].channel_id==ch.id) {
						updated = true;
						serverDocument.config.moderation.status_messages[status_message].channel_id = ch.guild.defaultChannel.id;
					}
				}
				for(let i=0; i<serverDocument.config.rss_feeds.length; i++) {
					if(serverDocument.config.rss_feeds[i].streaming.isEnabled && serverDocument.config.rss_feeds[i].streaming.enabled_channel_ids.indexOf(ch.id)>-1) {
						updated = true;
						serverDocument.config.rss_feeds[i].streaming.enabled_channel_ids.splice(serverDocument.config.rss_feeds[i].streaming.enabled_channel_ids.indexOf(ch.id), 1);
						if(serverDocument.config.rss_feeds[i].streaming.enabled_channel_ids.length==0) {
							serverDocument.config.rss_feeds[i].streaming.enabled_channel_ids = [ch.guild.defaultChannel.id];
						}
					}
				}
				for(let i=0; i<serverDocument.config.translated_messages.length; i++) {
					if(serverDocument.config.translated_messages[i].enabled_channel_ids.indexOf(ch.id)>-1) {
						updated = true;
						serverDocument.config.translated_messages[i].enabled_channel_ids.splice(serverDocument.config.translated_messages[i].enabled_channel_ids.indexOf(ch.id), 1);
						if(serverDocument.config.translated_messages[i].enabled_channel_ids.length==0) {
							serverDocument.config.translated_messages[i].enabled_channel_ids = [ch.guild.defaultChannel.id];
						}
					}
				}
				if(serverDocument.config.voicetext_channels.indexOf(ch.id)>-1) {
					updated = true;
					serverDocument.config.voicetext_channels.splice(serverDocument.config.voicetext_channels.indexOf(ch.id), 1);
				}

				// Save changes to serverDocument if necessary
				if(updated) {
					serverDocument.save(err => {
						if(err) {
							winston.error("Failed to save server data for removing channel", {svrid: ch.guild.id}, err);
						}
					});
				}
			} else {
				winston.error("Failed to find server data for channelDeleted", {svrid: ch.guild.id}, err);
			}
		});
	}
};
