const BaseEvent = require("../BaseEvent");
const { StatusMessages } = require("../../Constants");

class GuildMemberRemove extends BaseEvent {
	async handle (member) {
		const { guild } = member;
		const serverDocument = await Servers.findOne(guild.id);
		if (!serverDocument) {
			return logger.debug("Failed to find server data for GuildMemberRemove.", { svrid: guild.id, usrid: member.user.id });
		}
		const serverQueryDocument = serverDocument.query;

		// Autotranslation Messages
		if (serverDocument.config.translated_messages.length) {
			const translationDocument = serverDocument.config.translated_messages.id(member.id);
			if (translationDocument) serverQueryDocument.clone.id("config.translated_messages", member.id).remove();
		}

		// Channel Data of Member
		Object.values(serverDocument.channels).forEach(channelDocument => {
			const spamQueryDocument = serverQueryDocument.clone.id("channels", channelDocument._id).id("spam_filter_data", member.id);
			if (spamQueryDocument.val) spamQueryDocument.remove();
		});

		try {
			await serverDocument.save();
		} catch (err) {
			logger.warn("Failed to save server data for GuildMemberRemove.", { svrid: guild.id, usrid: member.user.id }, err);
		}

		if (serverDocument.config.moderation.isEnabled) {
			// Send member_removed_message if necessary
			if (serverDocument.config.moderation.status_messages.member_removed_message.isEnabled) {
				logger.verbose(`Member '${member.user.tag}' removed from server '${guild.name}'`, { svrid: guild.id, usrid: member.user.id });
				const channel = guild.channels.get(serverDocument.config.moderation.status_messages.member_removed_message.channel_id);
				if (channel) {
					const channelDocument = serverDocument.channels[channel.id];
					if (!channelDocument || channelDocument.bot_enabled) {
						const message = serverDocument.config.moderation.status_messages.member_removed_message.messages.random;
						channel.send({
							embed: StatusMessages.GUILD_MEMBER_REMOVE(message, member, serverDocument, this.client),
						}).catch(err => {
							logger.debug(`Failed to send StatusMessage for GUILD_MEMBER_REMOVE.`, { svrid: guild.id, chid: channel.id }, err);
						});
					}
				}
			}

			// Send member_removed_pm if necessary
			if (serverDocument.config.moderation.status_messages.member_removed_pm.isEnabled && !member.user.bot) {
				try {
					const channel = await member.user.createDM();
					await channel.send({
						embed: {
							color: 0x00FF00,
							thumbnail: {
								url: member.guild.iconURL() || "",
							},
							title: `Before you go!`,
							description: serverDocument.config.moderation.status_messages.new_member_pm.message_content || "It seems like there's no leave message for members! Have a cookie instead 🍪",
						},
					});
				} catch (err) {
					logger.debug(`Failed to send leave message to ${member.user.tag}! They probably don't share a server with me anymore.`, { svrid: member.guild.id, usrid: member.user.id }, err);
				}
			}
		}
	}
}

module.exports = GuildMemberRemove;
