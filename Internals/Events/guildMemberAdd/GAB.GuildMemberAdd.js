const BaseEvent = require("../BaseEvent.js");
const { LoggingLevels, StatusMessages } = require("../../Constants");
/* eslint-disable max-len */

/**
 * Member joined a server
 */
class GuildMemberAdd extends BaseEvent {
	async handle (member) {
		// Get server data
		const serverDocument = await Servers.findOne(member.guild.id);
		if (serverDocument) {
			if (serverDocument.config.moderation.isEnabled) {
				// Send new_member_message if necessary
				if (serverDocument.config.moderation.status_messages.new_member_message.isEnabled) {
					logger.verbose(`Member "${member.user.tag}" joined server "${member.guild}"`, { svrid: member.guild.id, usrid: member.id });
					const ch = member.guild.channels.get(serverDocument.config.moderation.status_messages.new_member_message.channel_id);
					if (ch) {
						const channelDocument = serverDocument.channels[ch.id];
						if (!channelDocument || channelDocument.bot_enabled) {
							const message = serverDocument.config.moderation.status_messages.new_member_message.messages.random;
							if (message) {
								ch.send({
									embed: StatusMessages.GUILD_MEMBER_ADD(message, member, serverDocument, this.client),
								}).catch(err => {
									logger.debug(`Failed to send StatusMessage for GUILD_MEMBER_ADD.`, { svrid: member.guild.id, chid: ch.id }, err);
								});
							}
						}
					}
				}

				// Send new_member_pm if necessary
				if (serverDocument.config.moderation.status_messages.new_member_pm.isEnabled && !member.user.bot) {
					try {
						await member.send({
							embed: {
								color: 0x00FF00,
								thumbnail: {
									url: member.guild.iconURL() || "",
								},
								title: `Welcome to ${member.guild}!`,
								description: serverDocument.config.moderation.status_messages.new_member_pm.message_content || "It seems like there's no join message for new members! Have a cookie instead 🍪",
								footer: {
									text: `I'm ${this.client.getName(serverDocument, member.guild.members.get(this.client.user.id))} by the way. Learn more by using "${await this.client.getCommandPrefix(member.guild, serverDocument)}help"!`,
								},
							},
						});
					} catch (err) {
						logger.verbose(`Failed to send message to member for GUILD_MEMBER_ADD. Either the user has DM's blocked or they blocked me.`, {}, err);
					}
				}

				// Add member to new_member_roles
				let exceptionOccurred = false;
				let rolesAdded = false;

				await Promise.all(serverDocument.config.moderation.new_member_roles.map(async roleID => {
					const role = member.guild.roles.get(roleID);
					if (!role) return;

					try {
						await member.roles.add(role, "Added New Member Role(s) to this new member.");
						rolesAdded = true;
					} catch (err) {
						logger.debug(`Failed to add new role to member.`, { svrid: member.guild.id, userid: member.id, role: role.id }, err);
						exceptionOccurred = true;
					}
				}));

				(!exceptionOccurred && rolesAdded && this.client.logMessage(serverDocument, LoggingLevels.INFO, `Added New Member Role(s) to a new member.`, null, member.id)) || this.client.logMessage(serverDocument, LoggingLevels.WARN, `I was unable to add New Member Role(s) to a new member!`, null, member.id);
			}
		}
	}
}

module.exports = GuildMemberAdd;
