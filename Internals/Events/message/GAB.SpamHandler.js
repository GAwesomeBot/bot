const BaseEvent = require("../BaseEvent");
const levenshtein = require("fast-levenshtein");
const { LoggingLevels, Colors } = require("../../Constants");

class SpamHandler extends BaseEvent {
	requirements (msg) {
		if (!msg.guild) return false;
		if (msg.author.bot) return false;
		return !msg.editedAt && msg.type === "DEFAULT";
	}

	async handle (msg) {
		const serverDocument = await Servers.findOne(msg.guild.id);
		if (!serverDocument) {
			logger.warn(`Could not satisfy SpamHandler because ${msg.guild.id} is missing a Document.`, { svrid: msg.guild.id });
			return;
		}
		let channelDocument = serverDocument.channels[msg.channel.id];
		if (!channelDocument) {
			serverDocument.query.prop("channels").push({ _id: msg.channel.id });
			channelDocument = serverDocument.channels[msg.channel.id];
		}
		const memberAdminLevel = this.client.getUserBotAdmin(msg.guild, serverDocument, msg.member);
		// Get member data (for this server)
		let memberDocument = serverDocument.members[msg.author.id];
		// Create member data if not found
		if (!memberDocument) {
			serverDocument.query.prop("members").push({ _id: msg.author.id });
			memberDocument = serverDocument.members[msg.author.id];
		}
		if (serverDocument.config.moderation.isEnabled &&
				serverDocument.config.moderation.filters.spam_filter.isEnabled &&
				!serverDocument.config.moderation.filters.spam_filter.disabled_channel_ids.includes(msg.channel.id) &&
				memberAdminLevel < 1) {
			const channelQueryDocument = serverDocument.query.id("channels", channelDocument._id);

			// Tracks spam with each new message (auto-delete after 45 seconds)
			let spamDocument = channelQueryDocument.clone.id("spam_filter_data", msg.author.id);
			if (!spamDocument.val) {
				channelQueryDocument.prop("spam_filter_data").push({ _id: msg.author.id });
				spamDocument = channelQueryDocument.id(msg.author.id)
					.inc("message_count")
					.set("last_message_content", msg.cleanContent);
				this.client.setTimeout(async () => {
					const timedServerDocument = await Servers.findOne(msg.guild.id).catch(err => {
						logger.debug(`Failed to get server document for spam filter...`, { svrid: msg.guild.id }, err);
					});
					if (serverDocument) {
						const timedChannelDocument = timedServerDocument.query.id("channels", msg.channel.id);
						spamDocument = timedChannelDocument.id("spam_filter_data", msg.author.id);
						if (spamDocument.val) {
							spamDocument.remove();
							timedServerDocument.save().catch(err => {
								logger.debug("Failed to save server data for spam filter", { svrid: msg.guild.id }, err);
							});
						}
					}
				}, 45000);
				// Add this message to spamDocument if similar to the last one
			} else if (levenshtein.get(spamDocument.val.last_message_content, msg.cleanContent) < 3) {
				spamDocument.inc("message_count").set("last_message_content", msg.cleanContent);

				// First-time spam filter violation
				if (spamDocument.val.message_count === serverDocument.config.moderation.filters.spam_filter.message_sensitivity) {
					// eslint-disable-next-line max-len
					logger.verbose(`Handling first-time spam from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}" `, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
					this.client.logMessage(serverDocument, LoggingLevels.INFO,
						`Handling first-time spam from member "${msg.author.tag}" in channel "${msg.channel.name}".`, msg.channel.id, msg.author.id);
					// Message user and tell them to stop
					msg.author.send({
						embed: {
							color: Colors.RED,
							title: `⚠️ Stop Spamming! ⚠️`,
							description: `Stop spamming in #${msg.channel.name} (${msg.channel}) on ${msg.guild}.\nThe chat moderators have been notified about this.`,
						},
					});

					// Message bot admins about user spamming
					this.client.messageBotAdmins(msg.guild, serverDocument, {
						embed: {
							color: Colors.RED,
							description: `**@${this.client.getName(serverDocument, msg.member, true)}** is spamming in #${msg.channel.name} (${msg.channel}) on ${msg.guild}.`,
						},
					});

					// Deduct 25 GAwesomePoints if necessary
					if (serverDocument.config.commands.points.isEnabled) {
						// Get user data
						const userDocument = await Users.findOne(msg.author.id);
						if (userDocument) {
							userDocument.query.inc("points", -25);
							await userDocument.save().catch(err => {
								logger.debug(`Failed to save user document...`, { usrid: msg.author.id }, err);
							});
						}
					}
					// Add strike for user
					const queryDocument = serverDocument.query.id("members", memberDocument._id);
					queryDocument.prop("strikes").push({
						admin: this.client.user.id,
						reason: `First-time spam violation in #${msg.channel.name} (${msg.channel})`,
					});
					// TODO: ModLog.create
				} else if (spamDocument.val.message_count === serverDocument.config.moderation.filters.spam_filter.message_sensitivity * 2) {
					// Second-time spam filter violation
					// eslint-disable-next-line max-len
					logger.verbose(`Handling second-time spam from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}" `, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
					this.client.logMessage(serverDocument, LoggingLevels.INFO,
						`Handling second-time spam from member "${msg.author.tag}" in channel "${msg.channel.name}".`, msg.channel.id, msg.author.id);

					// Delete spam messages if necessary
					if (serverDocument.config.moderation.filters.spam_filter.delete_messages) {
						const filteredMessages = [];
						const foundMessages = await msg.channel.messages.fetch({ limit: 50 }).catch(err => {
							logger.debug(`Failed to fetch messages for spam filter...`, { svrid: msg.guild.id, chid: msg.channel.id }, err);
						});
						foundMessages.size > 0 && foundMessages.forEach(foundMessage => {
							if (foundMessage.author.id === msg.author.id && levenshtein.get(spamDocument.val.last_message_content, foundMessage.cleanContent) < 3) {
								filteredMessages.push(foundMessage);
							}
						});
						if (filteredMessages.length >= 1) {
							try {
								msg.channel.bulkDelete(filteredMessages, true);
							} catch (err) {
								// eslint-disable-next-line max-len
								logger.verbose(`Failed to delete spam messages from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
							}
						}
					}

					// Get user data
					const userDocument = await Users.findOne(msg.author.id);
					if (userDocument) {
						// Handle this as a violation
						let violatorRoleID = null;
						// eslint-disable-next-line max-len
						if (!isNaN(serverDocument.config.moderation.filters.spam_filter.violator_role_id) && !msg.member.roles.has(serverDocument.config.moderation.filters.spam_filter.violator_role_id)) {
							violatorRoleID = serverDocument.config.moderation.filters.spam_filter.violator_role_id;
						}
						// eslint-disable-next-line max-len
						this.client.handleViolation(msg.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You continued to spam in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `**@${this.client.getName(serverDocument, msg.member, true)}** (${msg.member}) continues to spam in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `Second-time spam violation in #${msg.channel.name} (${msg.channel})`, serverDocument.config.moderation.filters.spam_filter.action, violatorRoleID);
					}
					await userDocument.save().catch(err => {
						logger.debug(`Failed to save user document...`, { usrid: msg.author.id }, err);
					});
					// Clear spamDocument, restarting the spam filter process
					spamDocument.remove();
				}
			}
		}
		await serverDocument.save();
	}
}

module.exports = SpamHandler;
