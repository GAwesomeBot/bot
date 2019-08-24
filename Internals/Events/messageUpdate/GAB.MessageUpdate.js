const BaseEvent = require("../BaseEvent.js");
const { StatusMessages } = require("../../Constants");

class MessageUpdate extends BaseEvent {
	requirements (oldMsg, msg) {
		return msg && oldMsg && msg.guild && msg.author.id !== this.client.user.id && !msg.author.bot && msg.content !== oldMsg.content;
	}

	async handle (oldMsg, msg) {
		const serverDocument = await Servers.findOne(msg.guild.id);
		if (!serverDocument) {
			return logger.debug("Failed to find server data for message update status message.", { svrid: msg.guild.id, chid: msg.channel.id, msgid: msg.id });
		}

		const statusMessageDocument = serverDocument.config.moderation.status_messages.message_edited_message;
		if (serverDocument.config.moderation.isEnabled && statusMessageDocument.isEnabled && statusMessageDocument.enabled_channel_ids.includes(msg.channel.id)) {
			logger.verbose(`Message by member '${msg.author.tag}' on server '${msg.guild.name}' edited.`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, msgid: msg.id });

			// Send message in different channel
			if (statusMessageDocument.type === "single" && statusMessageDocument.channel_id) {
				const channel = msg.guild.channels.get(statusMessageDocument.channel_id);
				if (channel) {
					const targetChannelDocument = serverDocument.channels[channel.id];
					if (!targetChannelDocument || targetChannelDocument.bot_enabled) {
						channel.send({
							embed: StatusMessages.MESSAGE_EDITED(statusMessageDocument.type, msg, oldMsg, serverDocument, this.client),
							disableEveryone: true,
						}).catch(err => {
							logger.debug(`Failed to send StatusMessage for MESSAGE_EDITED.`, { svrid: msg.guild.id, chid: channel.id }, err);
						});
					}
				}
			} else if (statusMessageDocument.type === "msg") {
				const channelDocument = serverDocument.channels[msg.channel.id];
				if (!channelDocument || channelDocument.bot_enabled) {
					msg.channel.send({
						embed: StatusMessages.MESSAGE_EDITED(statusMessageDocument.type, msg, oldMsg, serverDocument, this.client),
						disableEveryone: true,
					}).catch(err => {
						logger.debug(`Failed to send StatusMessage for MESSAGE_EDITED.`, { svrid: msg.guild.id, chid: msg.channel.id }, err);
					});
				}
			}
		}
	}
}

module.exports = MessageUpdate;
