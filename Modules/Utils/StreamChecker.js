const isStreaming = require("./StreamerUtils");
const { Templates: { StreamingTemplate }, LoggingLevels } = require("../../Internals/Constants");

// Checks if a user is streaming on Twitch, YouTube Gaming, and posts message in server channel if necessary
module.exports = async (client, server, serverDocument, streamerDocument) => {
	try {
		const streamerQueryDocument = serverDocument.query.id("config.streamers_data", streamerDocument._id);

		const data = await isStreaming(streamerDocument.type, streamerDocument._id);

		if (data && !streamerDocument.live_state) {
			logger.verbose(`Streamer "${streamerDocument._id}" started streaming`, { svrid: server.id });
			streamerQueryDocument.set("live_state", true);

			const channel = streamerDocument.channel_id ? server.channels.get(streamerDocument.channel_id) : null;
			if (channel) {
				const channelDocument = serverDocument.channels[channel.id];
				if (!channelDocument || channelDocument.bot_enabled) {
					await channel.send(StreamingTemplate(data));
				}
			}
		} else if (!data) {
			streamerQueryDocument.set("live_state", false);
		}

		// Save serverDocument if necessary
		await serverDocument.save().catch(err => {
			logger.warn(`Failed to save data for streamer "${streamerDocument._id}"`, { svrid: server.id }, err);
		});
	} catch (err) {
		logger.debug(`An error occurred while checking streamer status -_-`, { svrid: server.id, streamer: streamerDocument._id }, err);
		client.logMessage(serverDocument, LoggingLevels.WARN, `Failed to fetch streamer ${streamerDocument._id}, they might not be configured correctly!`, streamerDocument.channel_id);
	}
};
