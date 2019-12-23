const BaseEvent = require("../BaseEvent");
const { Colors } = require("../../Constants");

class AFKHandler extends BaseEvent {
	requirements (msg) {
		if (!msg.guild) return false;
		if (msg.editedAt || msg.type !== "DEFAULT") return false;
		if (msg.author.id === this.client.user.id || msg.author.bot || this.configJSON.userBlocklist.includes(msg.author.id)) {
			if (msg.author.id === this.client.user.id) {
				return false;
			} else {
				logger.silly(`Ignored ${msg.author.tag} for AFK handler.`, { usrid: msg.author.id, globallyBlocked: this.configJSON.userBlocklist.includes(msg.author.id) });
				return false;
			}
		}
		return !!msg.channel.postable;
	}

	async handle (msg) {
		const { serverDocument } = msg.guild;
		if (serverDocument && msg.mentions.members.size && serverDocument.config.commands.afk.isEnabled && !serverDocument.config.commands.afk.disabled_channel_ids.includes(msg.channel.id)) {
			msg.mentions.members.forEach(async member => {
				if (![this.client.user.id, msg.author.id].includes(member.id) && !serverDocument.config.blocked.includes(member.id) && !member.user.bot) {
					// Check if they have a server AFK message
					// Takes priority over global AFK messages
					const targetMemberDocument = serverDocument.members[member.id];
					if (targetMemberDocument && targetMemberDocument.afk_message) {
						msg.channel.send({
							embed: {
								thumbnail: {
									url: member.user.displayAvatarURL(),
								},
								color: Colors.INFO,
								title: `@__${this.client.getName(serverDocument, member)}__ is currently AFK.`,
								description: `${targetMemberDocument.afk_message}`,
							},
						}).catch(err => {
							logger.debug(`Failed to send AFK message to channel.`, { usrid: member.id, svrid: msg.guild.id, chid: msg.channel.id, msgid: msg.id }, err);
						});
					} else {
						// User doesn't have server AFK message, go for global one
						const targetUserDocument = await Users.findOne(member.id).catch(err => {
							logger.verbose(`Failed to find user document for global AFK message >.>`, { svrid: msg.guild.id, usrid: member.id, chid: msg.channel.id, msgid: msg.id }, err);
						});
						if (targetUserDocument && targetUserDocument.afk_message) {
							msg.channel.send({
								embed: {
									thumbnail: {
										url: member.user.displayAvatarURL(),
									},
									color: Colors.INFO,
									title: `@__${this.client.getName(serverDocument, member)}__ is currently AFK.`,
									description: `${targetUserDocument.afk_message}`,
								},
							}).catch(err => {
								logger.debug(`Failed to send AFK message to channel.`, { usrid: member.id, svrid: msg.guild.id, chid: msg.channel.id, msgid: msg.id }, err);
							});
						}
					}
				}
			});
		}
		// Remove AFK Messages on User activity
		let changed = false;
		const userDocument = await Users.findOne(msg.author.id).catch(err => {
			logger.verbose(`Failed to find user document for resetting global AFK message >.>`, { svrid: msg.guild.id, usrid: msg.author.id, chid: msg.channel.id, msgid: msg.id }, err);
		});
		if (userDocument && userDocument.afk_message) {
			changed = true;
			userDocument.query.set("afk_message", null);
		}
		if (!serverDocument) return;
		const memberDocument = serverDocument.members[msg.author.id];
		if (memberDocument && memberDocument.afk_message) {
			changed = true;
			serverDocument.query.id("members", msg.author.id).set("afk_message", null);
		}
		serverDocument.save();
		if (userDocument) userDocument.save();
		if (changed) {
			msg.reply({
				embed: {
					color: Colors.GREEN,
					title: `Welcome back! 🎊`,
					description: `I've removed your AFK message.`,
				},
			}).catch(err => {
				logger.debug(`Failed to send AFK removal message to channel.`, { usrid: msg.author.id, svrid: msg.guild.id, chid: msg.channel.id, msgid: msg.id }, err);
			});
		}
	}
}

module.exports = AFKHandler;
