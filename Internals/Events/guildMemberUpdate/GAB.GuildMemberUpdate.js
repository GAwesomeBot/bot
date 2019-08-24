const BaseEvent = require("../BaseEvent");
const { StatusMessages } = require("../../Constants");

class GuildMemberUpdate extends BaseEvent {
	async handle (oldMember, member) {
		const serverDocument = await Servers.findOne(member.guild.id);
		if (!serverDocument) {
			return logger.debug("Failed to find server data for GuildMemberUpdate.", { svrid: member.guild.id, usrid: member.user.id });
		}

		if (serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.status_messages.member_nick_updated_message.isEnabled) {
			const channel = member.guild.channels.get(serverDocument.config.moderation.status_messages.member_nick_updated_message.channel_id);
			if (channel) {
				const channelDocument = serverDocument.channels[channel.id];
				if (!channelDocument || channelDocument.bot_enabled) {
					// Nickname created
					if (oldMember.nickname !== member.nickname && !oldMember.nickname && member.nickname) {
						channel.send({
							embed: StatusMessages.MEMBER_CREATE_NICK(member, serverDocument, this.client),
						}).catch(err => {
							logger.debug(`Failed to send StatusMessage for MEMBER_CREATE_NICK.`, { svrid: member.guild.id, chid: channel.id }, err);
						});
					}

					// Nickname changed
					if (oldMember.nickname !== member.nickname && oldMember.nickname && member.nickname) {
						channel.send({
							embed: StatusMessages.MEMBER_CHANGE_NICK(member, oldMember.nickname, serverDocument, this.client),
						}).catch(err => {
							logger.debug(`Failed to send StatusMessage for MEMBER_CHANGE_NICK.`, { svrid: member.guild.id, chid: channel.id }, err);
						});
					}

					// Nickname removed
					if (oldMember.nickname !== member.nickname && oldMember.nickname && !member.nickname) {
						channel.send({
							embed: StatusMessages.MEMBER_REMOVE_NICK(member, oldMember.nickname, serverDocument, this.client),
						}).catch(err => {
							logger.debug(`Failed to send StatusMessage for MEMBER_REMOVE_NICK.`, { svrid: member.guild.id, chid: channel.id }, err);
						});
					}
				}
			}
		}
	}
}

module.exports = GuildMemberUpdate;
