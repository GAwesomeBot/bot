const BaseEvent = require("../BaseEvent.js");
const { StatusMessages } = require("../../Constants");

class PresenceUpdate extends BaseEvent {
	requirements (oldPresence, presence) {
		return presence && presence.activity && (!oldPresence || !oldPresence.activity || !oldPresence.activity.equals(presence.activity));
	}

	async handle (oldPresence, presence) {
		const serverDocument = await Servers.findOne(presence.guild.id);
		if (!serverDocument) {
			logger.warn(`Could not satisfy PresenceUpdate because ${presence.guild.id} is missing a Document.`, { svrid: presence.guild.id });
			return;
		}
		const streamingStatusMessageDocument = serverDocument.config.moderation.status_messages.member_streaming_message;
		const gameStatusMessageDocument = serverDocument.config.moderation.status_messages.member_game_updated_message;
		if (presence.activity && presence.activity.url &&
			streamingStatusMessageDocument.isEnabled && (streamingStatusMessageDocument.enabled_user_ids.includes(presence.id) || streamingStatusMessageDocument.enabled_user_ids.length === 0)) {
			const channel = presence.guild.channels.get(streamingStatusMessageDocument.channel_id);
			if (channel) {
				const channelDocument = serverDocument.channels[channel.id];
				if (!channelDocument || channelDocument.bot_enabled) {
					await channel.send({ embed: StatusMessages.GAME_STREAMING(this.client.getName(serverDocument, presence.member), presence.activity) }).catch(err => {
						logger.debug(`Failed to send StatusMessage for GAME_STREAMING.`, { svrid: presence.guild.id, chid: channel.id }, err);
					});
				}
			}
		} else if (gameStatusMessageDocument.isEnabled) {
			const channel = presence.guild.channels.get(gameStatusMessageDocument.channel_id);
			if (channel) {
				const channelDocument = serverDocument.channels[channel.id];
				if (!channelDocument || channelDocument.bot_enabled) {
					await channel.send({ embed: StatusMessages.GAME_UPDATE(this.client.getName(serverDocument, presence.member), presence.activity) }).catch(err => {
						logger.debug(`Failed to send StatusMessage for GAME_UPDATE.`, { svrid: presence.guild.id, chid: channel.id }, err);
					});
				}
			}
		}
	}
}

module.exports = PresenceUpdate;
