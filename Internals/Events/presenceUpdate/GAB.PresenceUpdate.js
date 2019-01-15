const BaseEvent = require("../BaseEvent.js");
const { StatusMessages } = require("../../Constants");

class PresenceUpdate extends BaseEvent {
	requirements (oldMember, member) {
		return member.presence.game && (!oldMember.presence.game || !oldMember.presence.game.equals(member.presence.game));
	}

	async handle (oldMember, member) {
		const serverDocument = await Servers.findOne(member.guild.id);
		if (!serverDocument) return;
		const streamingStatusMessageDocument = serverDocument.config.moderation.status_messages.member_streaming_message;
		const gameStatusMessageDocument = serverDocument.config.moderation.status_messages.member_game_updated_message;
		if (member.presence.game.streaming &&
			streamingStatusMessageDocument.isEnabled && (streamingStatusMessageDocument.enabled_user_ids.includes(member.id) || streamingStatusMessageDocument.enabled_user_ids.length === 0)) {
			const channel = member.guild.channels.get(streamingStatusMessageDocument.channel_id);
			if (channel) {
				const channelDocument = serverDocument.channels.id(channel.id);
				if (!channelDocument || channelDocument.bot_enabled) channel.send(StatusMessages.GAME_STREAMING(this.client.getName(serverDocument, member), member.presence.game));
			}
		} else if (gameStatusMessageDocument.isEnabled) {
			const channel = member.guild.channels.get(gameStatusMessageDocument.channel_id);
			if (channel) {
				const channelDocument = serverDocument.channels.id(channel.id);
				if (!channelDocument || channelDocument.bot_enabled) channel.send(StatusMessages.GAME_UPDATE(this.client.getName(serverDocument, member), member.presence.game));
			}
		}
	}
}

module.exports = PresenceUpdate;
