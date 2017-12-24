const BaseEvent = require("../BaseEvent");
const levenshtein = require("fast-levenshtein");
const { LoggingLevels } = require("../../Constants");

class SpamHandler extends BaseEvent {
	requirements (msg) {
		if (!msg.guild) return false;
		if (msg.author.bot) return false;
		return true;
	}

	async prerequisite (msg) {
		this.serverDocument = await this.bot.cache.get(msg.guild.id);
		this.channelDocument = this.serverDocument.channels.id(msg.channel.id);
		if (!this.channelDocument) {
			this.serverDocument.channels.push({ _id: msg.channel.id });
			this.channelDocument = this.serverDocument.channels.id(msg.channel.id);
		}
	}

	async handle (msg) {
		if (this.serverDocument) {
			const memberAdminLevel = this.bot.getUserBotAdmin(msg.guild, this.serverDocument, msg.member);
			// Get member data (for this server)
			let memberDocument = this.serverDocument.members.id(msg.author.id);
			// Create member data if not found
			if (!memberDocument) {
				this.serverDocument.members.push({ _id: msg.author.id });
				memberDocument = this.serverDocument.members.id(msg.author.id);
			}
			if (this.serverDocument.config.moderation.isEnabled &&
				this.serverDocument.config.moderation.filters.spam_filter.isEnabled &&
				!this.serverDocument.config.moderation.filters.spam_filter.disabled_channel_ids.includes(msg.channel.id) &&
				memberAdminLevel < 1) {
				// Tracks spam with each new message (auto-delete after 45 seconds)
				let spamDocument = this.channelDocument.spam_filter_data.id(msg.author.id);
				if (!spamDocument) {
					this.channelDocument.spam_filter_data.push({ _id: msg.author.id });
					spamDocument = this.channelDocument.spam_filter_data.id(msg.author.id);
					spamDocument.message_count++;
					spamDocument.last_message_content = msg.cleanContent;
					this.bot.setTimeout(async () => {
						this.serverDocument = await Servers.findOne({ _id: msg.guild.id }).exec().catch(err => {
							winston.debug(`Failed to get server document for spam filter..`, err);
						});
						if (this.serverDocument) {
							this.bot.cache.set(this.serverDocument._id, this.serverDocument);
							this.channelDocument = this.serverDocument.channels.id(msg.channel.id);
							spamDocument = this.channelDocument.spam_filter_data.id(msg.author.id);
							if (spamDocument) {
								spamDocument.remove();
								(await this.bot.cache.get(msg.guild.id)).save().catch(err => {
									winston.debug("Failed to save server data for spam filter", { svrid: msg.guild.id }, err);
								});
							}
						}
					}, 45000);
					// Add this message to spamDocument if similar to the last one
				} else if (levenshtein.get(spamDocument.last_message_content, msg.cleanContent) < 3) {
					spamDocument.message_count++;
					spamDocument.last_message_content = msg.cleanContent;

					// First-time spaMm filter violation
					if (spamDocument.message_count === this.serverDocument.config.moderation.filters.spam_filter.message_sensitivity) {
						// eslint-disable-next-line max-len
						winston.verbose(`Handling first-time spam from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}" `, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
						this.bot.logMessage(this.serverDocument, LoggingLevels.INFO, `Handling first-time spam from member "${msg.author.tag}" in channel "${msg.channel.name}".`, msg.channel.id, msg.author.id);
						// Message user and tell them to stop
						msg.author.send({
							embed: {
								color: 0xFF0000,
								title: `⚠️ Stop Spamming! ⚠️`,
								description: `Stop spamming in #${msg.channel.name} (${msg.channel}) on ${msg.guild}.\nThe chat moderators have been notified about this.`,
							},
						});

						// Message bot admins about user spamming
						this.bot.messageBotAdmins(msg.guild, this.serverDocument, {
							embed: {
								color: 0xFF0000,
								description: `**@${this.bot.getName(msg.channel.guild, this.serverDocument, msg.member, true)}** is spamming in #${msg.channel.name} (${msg.channel}) on ${msg.guild}.`,
							},
						});

						// Deduct 25 GAwesomePoints if necessary
						if (this.serverDocument.config.commands.points.isEnabled) {
							// Get user data
							const findDocument = await Users.findOrCreate({ _id: msg.author.id }).catch(err => {
								winston.debug(`Failed to find user document for spam filter...`, err);
							});
							const userDocument = findDocument && findDocument.doc;
							if (userDocument) {
								userDocument.points -= 25;
								await userDocument.save().catch(err => {
									winston.debug(`Failed to save user document...`, err);
								});
							}
						}
						// Add strike for user
						memberDocument.strikes.push({
							_id: this.bot.user.id,
							reason: `First-time spam violation in #${msg.channel.name} (${msg.channel})`,
						});
						// TODO: ModLog.create
					} else if (spamDocument.message_count === this.serverDocument.config.moderation.filters.spam_filter.message_sensitivity * 2) {
						// Second-time spam filter violation
						// eslint-disable-next-line max-len
						winston.verbose(`Handling second-time spam from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}" `, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
						this.bot.logMessage(this.serverDocument, LoggingLevels.INFO, `Handling second-time spam from member "${msg.author.tag}" in channel "${msg.channel.name}".`, msg.channel.id, msg.author.id);

						// Delete spam messages if necessary
						if (this.serverDocument.config.moderation.filters.spam_filter.delete_messages) {
							const filteredMessages = [];
							const foundMessages = await msg.channel.messages.fetch({ limit: 50 }).catch(err => {
								winston.debug(`Failed to fetch messages for spam filter..`, err);
							});
							foundMessages.size > 0 && foundMessages.forEach(foundMessage => {
								if (foundMessage.author.id === msg.author.id && levenshtein.get(spamDocument.last_message_content, foundMessage.cleanContent) < 3) {
									filteredMessages.push(foundMessage);
								}
							});
							if (filteredMessages.length >= 1) {
								try {
									msg.channel.bulkDelete(filteredMessages, true);
								} catch (err) {
									// eslint-disable-next-line max-len
									winston.verbose(`Failed to delete spam messages from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
								}
							}
						}

						// Get user data
						const findDocument = await Users.findOrCreate({ _id: msg.author.id }).catch(err => {
							winston.debug(`Failed to get user document for second time spam filter...`, err);
						});
						const userDocument = findDocument && findDocument.doc;
						if (userDocument) {
							// Handle this as a violation
							let violatorRoleID = null;
							// eslint-disable-next-line max-len
							if (!isNaN(this.serverDocument.config.moderation.filters.spam_filter.violator_role_id) && !msg.member.roles.has(this.serverDocument.config.moderation.filters.spam_filter.violator_role_id)) {
								violatorRoleID = this.serverDocument.config.moderation.filters.spam_filter.violator_role_id;
							}
							// eslint-disable-next-line max-len
							this.bot.handleViolation(msg.guild, this.serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You continued to spam in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `**@${this.bot.getName(msg.channel.guild, this.serverDocument, msg.member, true)}** (${msg.member}) continues to spam in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `Second-time spam violation in #${msg.channel.name} (${msg.channel})`, this.serverDocument.config.moderation.filters.spam_filter.action, violatorRoleID);
						}
						await userDocument.save().catch(err => {
							winston.debug(`Failed to save user document...`, err);
						});
						// Clear spamDocument, restarting the spam filter process
						spamDocument.remove();
					}
				}
			}
		}
	}
}

module.exports = SpamHandler;
