const BaseEvent = require("../BaseEvent.js");
const { StatusMessages } = require("../../Constants");

class PresenceUpdate extends BaseEvent {
	requirements (oldPresence, presence) {
		return presence && presence.activity && (!oldPresence || !oldPresence.activity || !oldPresence.activity.equals(presence.activity));
	}

	async handle (oldPresence, presence) {
		const serverDocument = await Servers.findOne(presence.guild.id);
		if (!serverDocument) return;
		const streamingStatusMessageDocument = serverDocument.config.moderation.status_messages.member_streaming_message;
		const gameStatusMessageDocument = serverDocument.config.moderation.status_messages.member_game_updated_message;
		if (presence.activity.url &&
			streamingStatusMessageDocument.isEnabled && (streamingStatusMessageDocument.enabled_user_ids.includes(presence.id) || streamingStatusMessageDocument.enabled_user_ids.length === 0)) {
			const channel = presence.guild.channels.get(streamingStatusMessageDocument.channel_id);
			if (channel) {
				const channelDocument = serverDocument.channels[channel.id];
				if (!channelDocument || channelDocument.bot_enabled) channel.send(StatusMessages.GAME_STREAMING(this.client.getName(serverDocument, presence.member), presence.activity));
			}
		} else if (gameStatusMessageDocument.isEnabled) {
			const channel = presence.guild.channels.get(gameStatusMessageDocument.channel_id);
			if (channel) {
				const channelDocument = serverDocument.channels[channel.id];
				if (!channelDocument || channelDocument.bot_enabled) channel.send(StatusMessages.GAME_UPDATE(this.client.getName(serverDocument, presence.member), presence.activity));
			}
		}
	}
}

module.exports = PresenceUpdate;
