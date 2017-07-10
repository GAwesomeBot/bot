const voiceStatsCollector = require("./../Modules/VoiceStatsCollector.js");

// User joined server voice channel
module.exports = (bot, db, config, winston, member, ch) => {
	if(member.id!=bot.user.id && !member.user.bot && (!ch.guild.afkChannelID || ch.id!=ch.guild.afkChannelID)) {
		db.servers.findOne({_id: ch.guild.id}, (err, serverDocument) => {
			if(!err && serverDocument) {
				// If this is a voice channel that has voicetext enabled
				if(serverDocument.config.voicetext_channels.indexOf(ch.id)>-1) {
					// Add member to voicetext channel
					const addToVoicetext = channel => {
						channel.editPermission(member.id, 3072, null, "member").then().catch(err => {
							winston.error(`Failed to add member '${member.user.username}' to voicetext channel '${channel.name}' on server '${ch.guild.name}'`, {svrid: ch.guild.id, chid: channel.id, usrid: member.id}, err);
						});
					};

					// Create voicetext channel if necessary
					const channel = ch.guild.channels.find(a => {
						return a.name==(`${ch.name.replaceAll(" ", "").toLowerCase().replace(/[^-_a-z0-9]/ig,'')}-voicetext`);
					});
					if(!channel) {
						ch.guild.createChannel(`${ch.name.replaceAll(" ", "").toLowerCase().replace(/[^-_a-z0-9]/ig,'')}-voicetext`).then(channel => {
							channel.editPermission(ch.guild.id, null, 3072, "role").then(() => {
								addToVoicetext(channel);
							}).catch(err => {
								winston.error(`Failed to create voicetext channel for '${ch.name}' on server '${ch.guild.name}'`, {svrid: ch.guild.id, chid: ch.id}, err);
							});
						}).catch();
					} else {
						addToVoicetext(channel);
					}
				}

				// Start timing voice activity if unmuted
				if(!member.voiceState.mute && !member.voiceState.selfMute) {
					voiceStatsCollector.startTiming(winston, ch.guild, serverDocument, member);
				}
			} else {
				winston.error("Failed to find server data for voiceChannelJoined", {svrid: ch.guild.id}, err);
			}
		});
	}
};
