const BaseEvent = require("../BaseEvent.js");
const { StatusMessages } = require("../../Constants");

class MessageDelete extends BaseEvent {
	requirements (msg) {
		return msg && msg.guild && msg.author.id !== this.client.user.id && !msg.author.bot;
	}

	async handle (msg) {
		const serverDocument = await Servers.findOne(msg.guild.id);
		if (!serverDocument) {
			return logger.debug("Failed to find server data for message deletion.", { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		}
		const serverQueryDocument = serverDocument.query;

		let channelDocument = serverDocument.channels[msg.channel.id];
		if (!channelDocument) {
			serverQueryDocument.push("channels", { _id: msg.channel.id });
			channelDocument = serverDocument.channels[msg.channel.id];
		}

		// Decrement today's message count for server
		if (serverDocument.messages_today > 0) serverQueryDocument.inc("messages_today", -1);

		// Count server stats if enabled in this channel
		if (channelDocument.isStatsEnabled) {
			// Decrement this week's message count for member
			const memberDocument = serverDocument.members[msg.author.id];
			if (memberDocument && memberDocument.messages > 0 && msg.createdTimestamp > serverDocument.stats_timestamp) {
				serverQueryDocument.id("members", memberDocument._id).inc("messages", -1);

				serverDocument.save().catch(err => {
					logger.warn("Failed to save server data for message deletion.", { svrid: msg.guild.id }, err);
				});
			}
		}

		// Find upvoted message and decrement points
		for (const voteTrigger of configJS.voteTriggers) {
			if (msg.content.startsWith(voteTrigger)) {
				const message = (await msg.channel.messages.fetch({
					limit: 1,
					before: msg.id,
				})).first();

				if (message && ![this.client.user.id, msg.author.id].includes(message.author.id) && !message.author.bot) {
					let userDocument = await Users.findOne(message.author.id);
					if (!userDocument) userDocument = Users.new({ _id: message.author.id });

					// Decrement points
					userDocument.query.inc("points", -1);

					userDocument.save().catch(err => {
						logger.warn("Failed to save user data for points decrementing", { usrid: message.author.id }, err);
					});
				}
			}
		}

		// Send message_deleted_message if necessary
		const statusMessageDocument = serverDocument.config.moderation.status_messages.message_deleted_message;
		if (serverDocument.config.moderation.isEnabled && statusMessageDocument.isEnabled && statusMessageDocument.enabled_channel_ids.includes(msg.channel.id)) {
			logger.verbose(`Message by member '${msg.author.tag}' on server '${msg.guild.name}' deleted`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, msgid: msg.id });

			// Send message in different channel
			if (statusMessageDocument.type === "single" && statusMessageDocument.channel_id) {
				const channel = msg.guild.channels.get(statusMessageDocument.channel_id);
				if (channel) {
					const targetChannelDocument = serverDocument.channels[channel.id];
					if (!targetChannelDocument || targetChannelDocument.bot_enabled) {
						channel.send({
							embed: StatusMessages.MESSAGE_DELETED(statusMessageDocument.type, msg, serverDocument, this.client),
							disableEveryone: true,
						}).catch(err => {
							logger.debug(`Failed to send StatusMessage for MESSAGE_DELETED.`, { svrid: msg.guild.id, chid: channel.id }, err);
						});
					}
				}
				// Send message in same channel
			} else if (statusMessageDocument.type === "msg") {
				if (!channelDocument || channelDocument.bot_enabled) {
					msg.channel.send({
						embed: StatusMessages.MESSAGE_DELETED(statusMessageDocument.type, msg, serverDocument, this.client),
						disableEveryone: true,
					}).catch(err => {
						logger.debug(`Failed to send StatusMessage for MESSAGE_DELETED.`, { svrid: msg.guild.id, chid: msg.channel.id }, err);
					});
				}
			}
		}
	}
}

module.exports = MessageDelete;
