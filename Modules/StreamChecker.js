const isStreaming = require("./StreamerUtils.js");

// Checks if a user is streaming on Twitch, YouTube Gaming, or HitBox and posts message in server channel if necessary
module.exports = (winston, svr, serverDocument, streamerDocument, callback) => {
	isStreaming(streamerDocument.type, streamerDocument._id, data => {
		let updated = false;

		// Send status message if stream started
		if(data && !streamerDocument.live_state) {
			winston.info(`Streamer '${streamerDocument._id}' started streaming`, {svrid: svr.id});
      streamerDocument.live_state = true;
      updated = true;

      const ch = streamerDocument.channel_id ? svr.channels.get(streamerDocument.channel_id) : svr.defaultChannel;
			if(ch) {
				const channelDocument = serverDocument.channels.id(ch.id);
				if(!channelDocument || channelDocument.bot_enabled) {
					ch.createMessage(`🎮 **${data.name}** started streaming on ${data.type}: ${data.game}\n${data.url}`);
				}
			}
		// Update live_state if stream ended
		} else if(!data && streamerDocument.live_state) {
			streamerDocument.live_state = false;
      updated = true;
		}

		// Save serverDocument if necessary
		if(updated) {
			serverDocument.save(err => {
				if(err) {
					winston.error(`Failed to save data for streamer '${streamerDocument._id}'`, {svrid: svr.id}, err);
				}
			});
		}

		callback();
	});
};
