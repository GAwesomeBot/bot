const isStreaming = require("./StreamerUtils");
const { Templates: { StreamingTemplate } } = require("../../Internals/Constants");

// Checks if a user is streaming on Twitch, YouTube Gaming, and posts message in server channel if necessary
module.exports = async (server, serverDocument, streamerDocument) => {
	try {
		const data = await isStreaming(streamerDocument.type, streamerDocument._id);

		if (data && !streamerDocument.live_state) {
			winston.verbose(`Streamer "${streamerDocument._id}" started streaming`, { svrid: server.id });
			streamerDocument.live_state = true;

			const channel = streamerDocument.channel_id ? server.channels.get(streamerDocument.channel_id) : server.defaultChannel;
			if (channel) {
				const channelDocument = serverDocument.channels.id(channel.id);
				if (!channelDocument || channelDocument.bot_enabled) {
					channel.send(StreamingTemplate(data));
				}
			}
		} else {
			streamerDocument.live_state = false;
		}

		// Save serverDocument if necessary
		await serverDocument.save().catch(err => {
			winston.warn(`Failed to save data for streamer "${streamerDocument._id}"`, { svrid: server.id }, err);
		});
	} catch (err) {
		winston.warn(`An error occurred while checking streamer status -_-`, { svrid: server.id, streamer: streamerDocument._id }, err.message);
	}
};
