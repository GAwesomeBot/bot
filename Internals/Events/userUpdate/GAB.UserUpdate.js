const BaseEvent = require("../BaseEvent");
const { StatusMessages } = require("../../Constants");

class UserUpdate extends BaseEvent {
	requirements (oldUser, newUser) {
		return !newUser.bot;
	}

	async handle (oldUser, newUser) {
		this.client.guilds.forEach(guild => {
			if (guild.members.has(newUser.id)) this.sendStatusMessages(guild, oldUser, newUser).catch(() => null);
		});
	}

	async sendStatusMessages (guild, oldUser, newUser) {
		const serverDocument = await Servers.findOne(guild.id);
		if (!serverDocument || !serverDocument.config.moderation.isEnabled) return;
		const member = guild.members.get(newUser.id);

		if (oldUser.username !== newUser.username && serverDocument.config.moderation.status_messages.member_username_updated_message.isEnabled) {
			const channel = guild.channels.get(serverDocument.config.moderation.status_messages.member_username_updated_message.channel_id);
			if (channel) {
				channel.send({
					embed: StatusMessages.USER_USERNAME_UPDATED(this.client, serverDocument, oldUser, member),
					disableEveryone: true,
				}).catch(err => {
					logger.debug(`Failed to send StatusMessage for USER_USERNAME_UPDATES.`, { svrid: guild.id, chid: channel.id }, err);
				});
			}
		}

		if (oldUser.avatar !== newUser.avatar && serverDocument.config.moderation.status_messages.member_avatar_updated_message.isEnabled) {
			const channel = guild.channels.get(serverDocument.config.moderation.status_messages.member_avatar_updated_message.channel_id);
			if (channel) {
				channel.send({
					embed: StatusMessages.USER_AVATAR_UPDATED(this.client, serverDocument, oldUser, member),
					disableEveryone: true,
				}).catch(err => {
					logger.debug(`Failed to send StatusMessage for USER_AVATAR_UPDATED.`, { svrid: guild.id, chid: channel.id }, err);
				});
			}
		}
	}
}

module.exports = UserUpdate;
