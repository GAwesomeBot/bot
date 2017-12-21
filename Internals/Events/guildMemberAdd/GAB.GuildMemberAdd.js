const BaseEvent = require("../BaseEvent.js");
const { LoggingLevels } = require("../../Constants");
/* eslint-disable max-len */

/**
 * Member joined a server
 */
class GuildMemberAdd extends BaseEvent {
	async handle (member) {
		// Get server data
		let serverDocument = await this.bot.cache.get(member.guild.id);
		if (serverDocument) {
			if (serverDocument.config.moderation.isEnabled) {
				// Send new_member_message if necessary
				if (serverDocument.config.moderation.status_messages.new_member_message.isEnabled) {
					winston.verbose(`Member "${member.user.tag}" joined server "${member.guild}"`, { svrid: member.guild.id, usrid: member.id });
					const ch = member.guild.channels.get(serverDocument.config.moderation.status_messages.new_member_message.channel_id);
					if (ch) {
						const channelDocument = serverDocument.channels.id(ch.id);
						if (!channelDocument || channelDocument.bot_enabled) {
							const random = serverDocument.config.moderation.status_messages.new_member_message.messages.random.replaceAll("@user", `**@${this.bot.getName(member.guild, serverDocument, member)}**`).replaceAll("@mention", `<@!${member.id}>`);
							if (random) {
								ch.send({
									embed: {
										color: 0x3669FA,
										description: random,
									},
								});
							} else {
								ch.send({
									embed: {
										color: 0xFF0000,
										title: `Uh-oh. Something went wrong!`,
										description: `Just letting you know, ${member} joined this server!`,
										footer: {
											text: `Psst; Admins should make sure their server is correctly configurated!`,
										},
									},
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
								title: `Welcome to ${member.guild} Discord Chat!`,
								description: serverDocument.config.moderation.status_messages.new_member_pm.message_content || "It seems like there's no join message for new members! Have a cookie instead 🍪",
								footer: {
									text: `I'm ${this.bot.getName(member.guild, serverDocument, member.guild.member(this.bot.user.id))} by the way. Learn more by using "${member.guild.commandPrefix}help"!`,
								},
							},
						});
					} catch (err) {
						winston.verbose(`Failed to send message to member for GUILD_MEMBER_ADD. Either the user has DM's blocked or they blocked me ;-;\n`, err);
					}
				}

				// Add member to new_member_roles
				const arrayOfRoles = [];
				for (let i = 0; i < serverDocument.config.moderation.new_member_roles.length; i++) {
					const role = member.guild.roles.get(serverDocument.config.moderation.new_member_roles[i]);
					if (role) {
						arrayOfRoles.push(role);
					}
				}
				if (arrayOfRoles.length > 0) {
					let x = 0;
					for (const role of arrayOfRoles) {
						try {
							await member.addRole(role, `Added new member role(s) to this member for joining the guild.`);
							x++;
						} catch (err) {
							winston.verbose(`Failed to add new role to member`, { svrid: member.guild.id, usrid: member.id, role: role.id }, err);
						}
					}
					(x === arrayOfRoles.length && this.bot.logMessage(serverDocument, LoggingLevels.INFO, `Added new member roles to a new member.`, null, member.id)) || this.bot.logMessage(serverDocument, LoggingLevels.ERROR, `I was unable to add some roles to a new member!`, null, member.id);
				}
			}
		}
	}
}

module.exports = GuildMemberAdd;
