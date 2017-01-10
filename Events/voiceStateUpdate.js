const voiceStatsCollector = require("./../Modules/VoiceStatsCollector.js");

// User voice connection updated on server
module.exports = (bot, db, config, winston, member, oldvoice) => {
	if(member.id!=bot.user.id && !member.user.bot && (!member.guild.afkChannelID || member.voiceState.channelID!=member.guild.afkChannelID)) {
		db.servers.findOne({_id: member.guild.id}, (err, serverDocument) => {
			if(!err && serverDocument) {
				// Start timing voice activity if user unmuted themselves
				if((oldvoice.mute || oldvoice.selfMute) && (!member.voiceState.mute && !member.voiceState.selfMute)) {
					voiceStatsCollector.startTiming(winston, member.guild, serverDocument, member);
				}

				// Stop timing voice activity if user muted themselves
				if((!oldvoice.mute && !oldvoice.selfMute) && (member.voiceState.mute || member.voiceState.selfMute)) {
					voiceStatsCollector.stopTiming(bot, winston, member.guild, serverDocument, member);
				}
			} else {
				winston.error("Failed to find server data for voiceStateUpdated", {svrid: member.guild.id}, err);
			}
		});
	}
};