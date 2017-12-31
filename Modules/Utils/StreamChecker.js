const { StreamerUtils: isStreaming } = require("./");

// Checks if a user is streaming on Twitch, YouTube Gaming, and posts message in server channel if necessary
/* eslint-disable require-await*/
module.exports = async (server, serverDocument, streamerDocument) => {
	isStreaming(streamerDocument.type, streamerDocument._id).then(async data => {
		let updated = false;
		// Send status message if stream started
		if (data && !streamerDocument.live_state) {
			winston.verbose(`Streamer "${streamerDocument._id}" started streaming`, { svrid: server.id });
			streamerDocument.live_state = true;
			updated = true;

			const channel = streamerDocument.channel_id ? server.channels.get(streamerDocument.channel_id) : server.defaultChannel;
			if (channel) {
				const channelDocument = serverDocument.channels.id(channel.id);
				if (!channelDocument || channelDocument.bot_enabled) {
					channel.send({
						embed: {
							color: 0x00FF00,
							description: `**${data.name}** started streaming on ${data.type}: ${data.game}\nYou can go watch them by going [here](${data.url})`,
							title: `A streamer started streaming!`,
							url: data.url,
						},
					});
				}
			}
		} else {
			streamerDocument.live_state = false;
			updated = true;
		}

		// Save serverDocument if necessary
		if (updated) {
			await serverDocument.save().catch(err => {
				winston.warn(`Failed to save data for streamer "${streamerDocument._id}"`, { svrid: server.id }, err);
			});
		}
	}).catch(err => {
		winston.warn(`An error occurred while checking streamer status -_-`, { svrid: server.id, streamer: streamerDocument._id }, err);
	});
};
