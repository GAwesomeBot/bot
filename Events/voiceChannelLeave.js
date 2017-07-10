const voiceStatsCollector = require("./../Modules/VoiceStatsCollector.js");

// User left server voice channel
module.exports = (bot, db, config, winston, member, ch) => {
	if(member.id!=bot.user.id && !member.user.bot && (!ch.guild.afkChannelID || ch.id!=ch.guild.afkChannelID)) {
		db.servers.findOne({_id: ch.guild.id}, (err, serverDocument) => {
			if(!err && serverDocument) {
				// Remove member from voicetext channel if necessary
				if(serverDocument.config.voicetext_channels.indexOf(ch.id)>-1) {
					const channel = ch.guild.channels.find(a => {
						return a.name==(`${ch.name.replaceAll(" ", "").toLowerCase().replace(/[^-_a-z0-9]/ig,'')}-voicetext`);
					});
					if(channel) {
						channel.editPermission(member.id, null, 3072, "member").then().catch(err => {
							winston.error(`Failed to remove member '${member.user.username}' from voicetext channel '${channel.name}' on server '${ch.guild.name}'`, {svrid: ch.guild.id, chid: channel.id, usrid: member.id}, err);
						});
					}
				}

				// Delete channel if it's from the room command
				const roomDocument = serverDocument.config.room_data.id(ch.id);
				if(roomDocument && ch.voiceMembers.size==0) {
					ch.delete().then(() => {
						roomDocument.remove();
						winston.info(`Auto-deleted voice room '${ch.name}' on server '${ch.guild.name}'`, {svrid: ch.guild.id, chid: ch.id});
					}).catch(err => {
						winston.error(`Failed to auto-deleted voice room '${ch.name}' on server '${ch.guild.name}'`, {svrid: ch.guild.id, chid: ch.id}, err);
					});
				}

				// Save changes to serverDocument
				serverDocument.save(err => {
					if(err) {
						winston.error("Failed to save server data for voiceChannelLeft", {svrid: ch.guild.id}, err);
					}
				});

				// Stop timing voice activity
				voiceStatsCollector.stopTiming(bot, winston, ch.guild, serverDocument, member);
			} else {
				winston.error("Failed to find server data for voiceChannelLeft", {svrid: ch.guild.id}, err);
			}
		});
	}
};
