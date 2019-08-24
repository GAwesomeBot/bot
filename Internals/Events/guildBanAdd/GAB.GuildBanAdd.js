const BaseEvent = require("../BaseEvent");
const { StatusMessages } = require("../../Constants");

class GuildBanAdd extends BaseEvent {
	async handle (guild, user) {
		const serverDocument = await Servers.findOne(guild.id);
		if (!serverDocument) {
			return logger.debug("Failed to find server data for GuildBanAdd.", { svrid: guild.id, usrid: user.id });
		}

		if (serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.status_messages.member_banned_message.isEnabled) {
			logger.verbose(`Member '${user.tag}' banned from guild '${guild}'.`, { svrid: guild.id, usrid: user.id });
			const channel = guild.channels.get(serverDocument.config.moderation.status_messages.member_banned_message.channel_id);
			if (channel) {
				const channelDocument = serverDocument.channels[channel.id];
				if (!channelDocument || channelDocument.bot_enabled) {
					const { messages } = serverDocument.config.moderation.status_messages.member_banned_message;
					const message = messages[Math.floor(Math.random() * messages.length)];
					if (!message) return;
					channel.send({
						embed: StatusMessages.GUILD_BAN_ADD(message, user),
					}).catch(err => {
						logger.debug(`Failed to send StatusMessage for GUILD_BAN_ADD.`, { svrid: guild.id, chid: channel.id }, err);
					});
				}
			}
		}
	}
}

module.exports = GuildBanAdd;
