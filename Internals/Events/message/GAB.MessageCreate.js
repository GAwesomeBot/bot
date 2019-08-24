/* eslint-disable max-len, max-depth, no-console */
const BaseEvent = require("../BaseEvent.js");
const { MicrosoftTranslate: mstranslate, Utils } = require("../../../Modules/index");
const {
	Gist,
	FilterChecker: checkFiltered,
} = Utils;
const {
	Errors: {
		Error: GABError,
	},
	Constants,
} = require("../../index");
const { LoggingLevels, Colors, UserAgent } = Constants;
const snekfetch = require("snekfetch");

class MessageCreate extends BaseEvent {
	requirements (msg) {
		if (!msg.channel.postable) {
			logger.verbose(`Ignoring message in unpostable channel.`, { msgid: msg.id, usrid: msg.author.id, chid: msg.channel.id });
			return false;
		}
		if (msg.type !== "DEFAULT") {
			logger.verbose(`Ignoring non-standard message.`, { msgid: msg.id, usrid: msg.author.id, chid: msg.channel.id });
			return false;
		}
		if (msg.author.id === this.client.user.id || msg.author.bot || this.configJSON.userBlocklist.includes(msg.author.id)) {
			if (msg.author.id === this.client.user.id) {
				logger.silly(`Ignoring self-message.`, { msgid: msg.id });
				return false;
			} else {
				logger.verbose(`Ignored ${msg.author.tag}.`, { msgid: msg.id, usrid: msg.author.id, globallyBlocked: this.configJSON.userBlocklist.includes(msg.author.id) });
				return false;
			}
		}
		return true;
	}

	/**
	 * Handles a MESSAGE_CREATE event
	 * @param {Message} msg The received message from Discord
	 */
	async handle (msg, proctime) {
		// Handle private messages
		if (!msg.guild) {
			if (this.client.messageListeners[msg.channel.id] && this.client.messageListeners[msg.channel.id][msg.author.id]) {
				if (msg.content.toLowerCase().trim() === "quit") {
					this.client.messageListeners[msg.channel.id][msg.author.id].reject(new GABError("AWAIT_QUIT"));
					this.client.deleteAwaitPMMessage(msg.channel, msg.author);
				} else if (this.client.messageListeners[msg.channel.id][msg.author.id].filter(msg)) {
					this.client.messageListeners[msg.channel.id][msg.author.id].resolve(msg);
					this.client.deleteAwaitPMMessage(msg.channel, msg.author);
				}
				return;
			}
			// Forward PM to maintainer(s) if enabled
			if (!this.configJSON.maintainers.includes(msg.author.id) && this.configJSON.pmForward) {
				let url = "";
				if (msg.content.length >= 1950) {
					const GistUpload = new Gist(this.client);
					const res = await GistUpload.upload({
						title: "Bot DM",
						text: msg.content,
					});
					if (res.url) {
						({ url } = res);
					}
				}
				for (const maintainerID of this.configJSON.maintainers) {
					let user = this.client.users.get(maintainerID);
					if (!user) {
						user = await this.client.users.fetch(maintainerID, true);
					}
					user.send({
						embed: {
							color: Colors.INFO,
							author: {
								name: `${msg.author.tag} just sent me a PM!`,
								icon_url: msg.author.displayAvatarURL(),
							},
							description: `${url !== "" ? `The message was too large! You can read it [here](${url}). 📨` : `\`\`\`${msg.content}\`\`\``}`,
						},
					});
				}
			}
			const commandFunction = this.client.getPMCommand(msg.command);
			if (commandFunction) {
				msg.author.userDocument = await Users.findOne(msg.author.id);
				logger.verbose(`Treating "${msg.cleanContent}" as a PM command.`, { usrid: msg.author.id, cmd: msg.command, suffix: msg.suffix });
				try {
					await commandFunction({
						client: this.client,
						configJS: this.configJS,
						utils: Utils,
						Utils,
						Constants,
					}, msg, {
						name: msg.command,
						usage: this.client.getPMCommandMetadata(msg.command).usage,
					});
				} catch (err) {
					logger.warn(`Failed to process PM command "${msg.command}"`, { usrid: msg.author.id }, err);
					msg.sendError(msg.command, err.stack);
				}
				await msg.author.userDocument.save().catch(err => {
					logger.verbose(`Failed to save user document...`, { usrid: msg.author.id }, err);
				});
			} else if (!this.client.getSharedCommand(msg.command)) {
				// Process chatterbot prompt
				logger.verbose(`Treating "${msg.cleanContent}" as a PM chatterbot prompt`, { usrid: msg.author.id });
				await msg.send({
					embed: {
						title: "Sorry!",
						description: "The chatterbot is currently unavailable. Please check back later!",
						color: Colors.SOFT_ERR,
					},
				});
			}
		} else {
			// Handle public messages
			const serverDocument = await Servers.findOne(msg.guild.id);
			if (serverDocument) {
				const serverQueryDocument = serverDocument.query;
				// Get channel data
				let channelDocument = serverDocument.channels[msg.channel.id];
				// Create channel data if not found
				if (!channelDocument) {
					serverDocument.query.prop("channels").push({ _id: msg.channel.id });
					channelDocument = serverDocument.channels[msg.channel.id];
				}
				const channelQueryDocument = serverQueryDocument.clone.id("channels", msg.channel.id);
				// Get member data (for this server)
				let memberDocument = serverDocument.members[msg.author.id];
				// Create member data if not found
				if (!memberDocument) {
					serverDocument.query.prop("members").push({ _id: msg.author.id });
					memberDocument = serverDocument.members[msg.author.id];
				}
				const memberQueryDocument = serverQueryDocument.clone.id("members", msg.author.id);
				const memberBotAdminLevel = this.client.getUserBotAdmin(msg.guild, serverDocument, msg.member);
				// Increment today's message count for server
				if (!msg.editedAt) serverQueryDocument.inc("messages_today");
				// Count server stats if enabled in this channel
				if (channelDocument.isStatsEnabled) {
					// Increment this week's message count for member
					if (!msg.editedAt) memberQueryDocument.inc("messages");
					// Set now as the last active time for member
					memberQueryDocument.set("last_active", Date.now());
					// Check if the user has leveled up a rank
					this.client.checkRank(msg.guild, serverDocument, serverQueryDocument.clone, msg.member, memberDocument);
				}

				// Check for start command from server admin
				if (!channelDocument.bot_enabled && memberBotAdminLevel > 1) {
					if (msg.command === "start") {
						channelQueryDocument.set("bot_enabled", true);
						let inAllChannels = false;
						if (msg.suffix && msg.suffix.toLowerCase().trim() === "all") {
							inAllChannels = true;
							Object.values(serverDocument.channels).forEach(targetChannelDocument => {
								serverQueryDocument.set(`channels.${targetChannelDocument._id}.bot_enabled`, true);
							});
						}
						msg.send({
							embed: {
								color: Colors.SUCCESS,
								description: `Hello! I'm back${inAllChannels ? " in all channels" : ""}! 🐬`,
							},
						});
						this.client.logMessage(serverDocument, LoggingLevels.INFO, `I was reactivated in ${inAllChannels ? "all channels!" : "a channel."}`, msg.channel.id, msg.author.id);
						await serverDocument.save();
						return;
					}
				}

				// TODO: Move this to seperate file
				// Check if using a filtered word
				if (checkFiltered(serverDocument, msg.channel, msg.content, false, true)) {
					// Delete offending message if necessary
					if (serverDocument.config.moderation.filters.custom_filter.delete_message) {
						try {
							await msg.delete();
						} catch (err) {
							logger.verbose(`Failed to delete filtered message from member "${msg.author.tag}" in channel ${msg.channel.name} on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
							this.client.logMessage(serverDocument, LoggingLevels.WARN, `I failed to delete a message containing a filtered word x.x`, msg.channel.id, msg.author.id);
						}
					}
					// Get user data
					const userDocument = await Users.findOne(msg.author.id);
					if (userDocument) {
						// Handle this as a violation
						let violatorRoleID = null;
						if (!isNaN(serverDocument.config.moderation.filters.custom_filter.violator_role_id) && !msg.member.roles.has(serverDocument.config.moderation.filters.custom_filter.violator_role_id)) {
							violatorRoleID = serverDocument.config.moderation.filters.custom_filter.violator_role_id;
						}
						this.client.handleViolation(msg.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You used a filtered word in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `**@${this.client.getName(serverDocument, msg.member, true)}** used a filtered word (\`${msg.cleanContent}\`) in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `Word filter violation ("${msg.cleanContent}") in #${msg.channel.name} (${msg.channel})`, serverDocument.config.moderation.filters.custom_filter.action, violatorRoleID);
					}
					return userDocument.save().catch(err => {
						logger.verbose(`Failed to save user document...`, { usrid: msg.author.id }, err);
					});
				}

				// Mention filter
				if (serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.filters.mention_filter.isEnabled && !serverDocument.config.moderation.filters.mention_filter.disabled_channel_ids.includes(msg.channel.id) && memberBotAdminLevel < 1) {
					let totalMentions = msg.mentions.members ? msg.mentions.members.size : msg.mentions.users.size + msg.mentions.roles.size;
					if (serverDocument.config.moderation.filters.mention_filter.include_everyone && msg.mentions.everyone) totalMentions++;

					// Check if mention count is higher than threshold
					if (totalMentions > serverDocument.config.moderation.filters.mention_filter.mention_sensitivity) {
						logger.verbose(`Handling mention spam from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });

						// Delete message if necessary
						if (serverDocument.config.moderation.filters.mention_filter.delete_message) {
							try {
								await msg.delete();
							} catch (err) {
								logger.debug(`Failed to delete filtered mention spam message from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
							}
						}

						// Get user data
						const userDocument = await Users.findOne(msg.author.id);
						if (userDocument) {
							// Handle this as a violation
							let violatorRoleID = null;
							if (!isNaN(serverDocument.config.moderation.filters.mention_filter.violator_role_id) && !msg.member.roles.has(serverDocument.config.moderation.filters.mention_filter.violator_role_id)) {
								violatorRoleID = serverDocument.config.moderation.filters.spam_filter.violator_role_id;
							}
							this.client.handleViolation(msg.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You put ${totalMentions} mentions in a message in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `**@${this.client.getName(serverDocument, msg.member, true)}** mentioned ${totalMentions} members / roles in a message in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `Mention spam (${totalMentions} members / roles) in #${msg.channel.name} (${msg.channel})`, serverDocument.config.moderation.filters.mention_filter.action, violatorRoleID);
						}
						await userDocument.save().catch(err => {
							logger.debug(`Failed to save user document...`, { usrid: msg.author.id }, err);
						});
					}
				}

				// TODO: Move this?
				// Only keep responding if the bot is on in the channel and author isn't blocked on the server
				if (channelDocument.bot_enabled && !serverDocument.config.blocked.includes(msg.author.id)) {
					// Translate message if necessary
					const translateMessage = () => {
						const translatedDocument = serverQueryDocument.clone.id("config.translated_messages", msg.author.id).val;
						if (translatedDocument) {
							// Detect the language (not always accurate; used only to exclude English messages from being translated to English)
							mstranslate.detect({ text: msg.cleanContent }, (err, res) => {
								if (err) {
									logger.debug(`Failed to auto-detect language for message "${msg.cleanContent}" from member "${msg.author.tag}" on server "${msg.guild}"`, { svrid: msg.guild.id, usrid: msg.author.id }, err);
									this.client.logMessage(serverDocument, LoggingLevels.WARN, `Failed to auto-detect language for message "${msg.cleanContent}" from member "${msg.author.tag}"`, msg.channel.id, msg.author.id);
								} else if (res.toLowerCase() !== "en") {
									// If the message is not in English, attempt to translate it from the language defined for the user
									mstranslate.translate({ text: msg.cleanContent, from: translatedDocument.source_language, to: "EN" }, (translateErr, translateRes) => {
										if (translateErr) {
											logger.debug(`Failed to translate "${msg.cleanContent}" from member "${msg.author.tag}" on server "${msg.guild}"`, { svrid: msg.channel.guild.id, usrid: msg.author.id }, translateErr);
											this.client.logMessage(serverDocument, LoggingLevels.WARN, `Failed to translate "${msg.cleanContent}" from member "${msg.author.tag}"`, msg.channel.id, msg.author.id);
										} else {
											msg.channel.send({
												embed: {
													color: Colors.INFO,
													title: `**@${this.client.getName(serverDocument, msg.member)}** said:`,
													description: `\`\`\`${translateRes}\`\`\``,
													footer: {
														text: `Translated using Microsoft Translator. The translated text might not be 100% accurate!`,
													},
												},
											});
										}
									});
								}
							});
						}
					};

					// Only keep responding if there isn't an ongoing command cooldown in the channel
					if (!channelDocument.isCommandCooldownOngoing || memberBotAdminLevel > 0) {
						// Check if message is a command, tag command, or extension trigger
						let cmd;
						if (msg.command !== null) {
							cmd = this.client.getPublicCommandName(msg.command);
							if (!cmd) cmd = msg.command;
						}
						const metadata = this.client.getPublicCommandMetadata(cmd);
						if (msg.command !== null && cmd !== null && metadata &&
								serverDocument.config.commands[cmd].isEnabled &&
								(metadata.adminExempt || memberBotAdminLevel >= serverDocument.config.commands[cmd].admin_level) &&
								!serverDocument.config.commands[cmd].disabled_channel_ids.includes(msg.channel.id)) {
							// Increment command usage count
							this.incrementCommandUsage(serverDocument, cmd);
							// Get User data
							const userDocument = await Users.findOne(msg.author.id);
							if (userDocument) {
								// NSFW filter for command suffix
								if (memberBotAdminLevel < 1 && metadata.defaults.isNSFWFiltered && checkFiltered(serverDocument, msg.channel, msg.suffix, true, false)) {
									// Delete offending message if necessary
									if (serverDocument.config.moderation.filters.nsfw_filter.delete_message) {
										try {
											await msg.delete();
										} catch (err) {
											logger.debug(`Failed to delete NSFW command message from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
											this.client.logMessage(serverDocument, LoggingLevels.WARN, `Failed to delete NSFW command message from member "${msg.author.tag}" in channel "${msg.channel.name}"`, msg.channel.id, msg.author.id);
										}
									}
									// Handle this as a violation
									let violatorRoleID = null;
									if (!isNaN(serverDocument.config.moderation.filters.nsfw_filter.violator_role_id) && !msg.member.roles.has(serverDocument.config.moderation.filters.nsfw_filter.violator_role_id)) {
										violatorRoleID = serverDocument.config.moderation.filters.nsfw_filter.violator_role_id;
									}
									this.client.handleViolation(msg.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You tried to fetch NSFW content in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `**@${this.client.getName(serverDocument, msg.member, true)}** tried to fetch NSFW content (\`${msg.cleanContent}\`) in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `NSFW filter violation ("${msg.cleanContent}") in #${msg.channel.name} (${msg.channel})`, serverDocument.config.moderation.filters.nsfw_filter.action, violatorRoleID);
								} else {
									// Assume its a command, lets run it!
									logger.verbose(`Treating "${msg.cleanContent}" as a command.`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
									this.client.logMessage(serverDocument, LoggingLevels.INFO, `Treating "${msg.cleanContent}" as a command`, msg.channel.id, msg.author.id);
									this.deleteCommandMessage(serverDocument, channelQueryDocument, msg);
									const commandFunction = this.client.getPublicCommand(cmd);
									if (!commandFunction) {
										const commandList = this.client.getPublicCommandList()
											.filter(c => this.client.getPublicCommand(c))
											.join(", ");
										msg.send({
											embed: {
												color: Colors.SOFT_ERR,
												title: `Hold on! ✋`,
												description: `The command \`${cmd}\` is not implemented yet!\nThis version of GAwesomeBot is still in heavy development and many commands do not work yet. 🚧\nHere are all the commands that are supported right now:\n\`\`\`${commandList}\`\`\``,
												footer: {
													text: `Over time more and more commands will be added. Contact your GAB maintainer for more support.`,
												},
											},
										});
									} else {
										try {
											const botObject = {
												client: this.client,
												configJS: this.configJS,
												utils: Utils,
												Utils,
												Constants,
											};
											const documents = {
												serverDocument,
												serverQueryDocument,
												channelDocument,
												channelQueryDocument,
												memberDocument,
												memberQueryDocument,
												userDocument,
												userQueryDocument: userDocument.query,
											};
											const commandData = {
												name: cmd,
												usage: metadata.usage,
												description: metadata.description,
											};
											await commandFunction(botObject, documents, msg, commandData);
										} catch (err) {
											logger.warn(`Failed to process command "${cmd}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
											this.client.logMessage(serverDocument, LoggingLevels.ERROR, `Failed to process command "${cmd}" X.X`, msg.channel.id, msg.author.id);
											msg.sendError(cmd, err.stack);
										}
									}
									await this.setCooldown(serverDocument, channelDocument, channelQueryDocument);
								}
								await userDocument.save().catch(err => {
									logger.verbose(`Failed to save user document...`, { usrid: msg.author.id }, err);
								});
							}
							// Check if it's a trigger for a tag command
						} else if (serverDocument.config.tags.list.id(msg.command) && serverDocument.config.tags.list.id(msg.command).isCommand) {
							logger.verbose(`Treating "${msg.cleanContent}" as a tag command.`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
							this.client.logMessage(serverDocument, LoggingLevels.INFO, `Treating "${msg.cleanContent}" as a tag command`, msg.channel.id, msg.author.id);
							this.deleteCommandMessage(serverDocument, channelQueryDocument, msg);
							msg.send(`${serverDocument.config.tags.list.id(msg.command).content}`, {
								disableEveryone: true,
							});
							await this.setCooldown(serverDocument, channelDocument, channelQueryDocument);
						} else {
							// Check if it's a command or keyword extension trigger
							let extensionApplied = false;
							const extensionLength = serverDocument.extensions.length;
							for (let i = 0; i < extensionLength; i++) {
								if (memberBotAdminLevel >= serverDocument.extensions[i].admin_level && !serverDocument.extensions[i].disabled_channel_ids.includes(msg.channel.id)) {
									const extensionDocument = await Gallery.findOneByObjectID(serverDocument.extensions[i]._id);
									const versionDocument = extensionDocument ? extensionDocument.versions.id(serverDocument.extensions[i].version) : null;
									if (!versionDocument || !versionDocument.accepted) continue;
									// Command extensions
									if (versionDocument && versionDocument.type === "command" && msg.command && msg.command === serverDocument.extensions[i].key) {
										logger.verbose(`Treating "${msg.cleanContent}" as a trigger for command extension "${serverDocument.extensions[i].name}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, extid: serverDocument.extensions[i]._id });
										this.client.logMessage(serverDocument, LoggingLevels.INFO, `Treating "${msg.cleanContent}" as a trigger for command extension "${serverDocument.extensions[i].name}"`, msg.channel.id, msg.author.id);
										extensionApplied = true;

										// Do the normal things for commands
										await Promise.all([this.incrementCommandUsage(serverDocument, msg.command), this.deleteCommandMessage(serverDocument, channelQueryDocument, msg), this.setCooldown(serverDocument, channelDocument, channelQueryDocument)]);
										const m = await msg.send(Constants.Text.EXTENSION_RUN(extensionDocument.name));
										const result = await this.client.runExtension(msg, serverDocument.extensions[i]);
										if (result.success) await m.delete().catch(() => null);
										else await m.edit(Constants.Text.EXTENSION_FAIL(extensionDocument.name));
									} else if (versionDocument && versionDocument.type === "keyword") {
										const keywordMatch = msg.content.containsArray(serverDocument.extensions[i].keywords, serverDocument.extensions[i].case_sensitive);
										if (((serverDocument.extensions[i].keywords.length > 1 || serverDocument.extensions[i].keywords[0] !== "*") && keywordMatch.selectedKeyword > -1) || (serverDocument.extensions[i].keywords.length === 1 && serverDocument.extensions[i].keywords[0] === "*")) {
											logger.verbose(`Treating "${msg.cleanContent}" as a trigger for keyword extension "${serverDocument.extensions[i].name}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, extid: serverDocument.extensions[i]._id });
											this.client.logMessage(serverDocument, LoggingLevels.INFO, `Treating "${msg.cleanContent}" as a trigger for keyword extension "${serverDocument.extensions[i].name}"`, msg.channel.id, msg.author.id);
											await this.client.runExtension(msg, serverDocument.extensions[i]);
										}
									}
								}
							}
							const prompt = msg.content.split(/\s+/)
								.splice(1)
								.join(" ")
								.trim();
							let shouldRunChatterbot = true;
							if ((msg.content.startsWith(`<@${this.client.user.id}>`) || msg.content.startsWith(`<@!${this.client.user.id}>`)) && msg.content.includes(" ") && msg.content.length > msg.content.indexOf(" ") && !this.client.getSharedCommand(msg.command) && prompt.toLowerCase().trim() === "help") {
								msg.send({
									embed: {
										color: Colors.INFO,
										title: `Hey there, it seems like you are lost!`,
										description: `Use \`${msg.guild.commandPrefix}help\` to learn how to use me on this server! 😄`,
									},
								});
								shouldRunChatterbot = false;
							}
							// Check if it's a chatterbot prompt
							if (!extensionApplied && shouldRunChatterbot && serverDocument.config.chatterbot.isEnabled && !serverDocument.config.chatterbot.disabled_channel_ids.includes(msg.channel.id) && (msg.content.startsWith(`<@${this.client.user.id}>`) || msg.content.startsWith(`<@!${this.client.user.id}>`)) && msg.content.includes(" ") && msg.content.length > msg.content.indexOf(" ") && !this.client.getSharedCommand(msg.command)) {
								translateMessage();
								await this.setCooldown(serverDocument, channelDocument, channelQueryDocument);
								logger.verbose(`Treating "${msg.cleanContent}" as a chatterbot prompt`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
								this.client.logMessage(serverDocument, LoggingLevels.INFO, `Treating "${msg.cleanContent}" as a chatterbot prompt`, msg.channel.id, msg.author.id);
								await msg.send({
									embed: {
										title: "Sorry!",
										description: "The chatterbot is currently unavailable. Please check back later!",
										color: Colors.SOFT_ERR,
									},
								});
							} else if (!extensionApplied && msg.mentions.members.find(mention => mention.id === this.client.user.id) && serverDocument.config.tag_reaction.isEnabled && !this.client.getSharedCommand(msg.command)) {
								const { random } = serverDocument.config.tag_reaction.messages;
								if (random) {
									const content = random.replaceAll("@user", `**@${this.client.getName(serverDocument, msg.member)}**`).replaceAll("@mention", `<@!${msg.author.id}>`);
									msg.send({
										content,
										disableEveryone: true,
									}).catch(err => {
										logger.debug(`Failed to send tag reaction.`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
									});
								}
							} else if (!extensionApplied) {
								translateMessage();
							}
						}
					} else {
						translateMessage();
					}
				}
				await serverDocument.save();
			}
		}

		logger.verbose(`Successfully finished handling Discord Message. CommandHandler took: ${process.hrtime(proctime)[0]}s ${Math.floor(process.hrtime(proctime)[1] / 1000000)}ms`, { content: msg.content, msgid: msg.id, svrid: msg.guild && msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
	}

	/**
	 * Get a chatter bot response
	 * @param {User|GuildMember|Snowflake} userOrUserID
	 * @param {?String} prompt
	 * @returns {Promise} The response if successful, otherwise an error
	 */
	async chatterPrompt (userOrUserID, prompt) {
		let res;
		try {
			res = await snekfetch.get(`http://api.program-o.com/v2/chatbot/?bot_id=6&say=${encodeURIComponent(prompt)}&convo_id=${userOrUserID.id ? userOrUserID.id : userOrUserID}&format=json`)
				.set({
					Accept: "application/json",
					"User-Agent": UserAgent,
				});
		} catch (err) {
			throw err;
		}
		let response;
		if (res.statusCode === 200 && res.body) {
			response = JSON.parse(res.body).botsay
				.replaceAll("Program-O", this.client.user.username)
				.replaceAll("<br/>", "\n")
				.replaceAll("Elizabeth", "Gilbert");
		} else {
			response = "I don't feel like talking right now... 😠";
		}
		return response;
	}

	/**
	 * Delete command message if necessary
	 * @param {Document} serverDocument
	 * @param {Query} channelQueryDocument
	 * @param {Message} msg
	 */
	async deleteCommandMessage (serverDocument, channelQueryDocument, msg) {
		if (serverDocument.config.delete_command_messages && msg.channel.permissionsFor(msg.guild.me).has("MANAGE_MESSAGES")) {
			channelQueryDocument.set("isMessageDeletedDisabled", true);
			try {
				await msg.delete();
			} catch (err) {
				logger.debug(`Failed to delete command message...`, {}, err);
				this.client.logMessage(serverDocument, LoggingLevels.WARN, `Failed to delete command message in channel.`, msg.channel.id, msg.author.id);
			}
			channelQueryDocument.set("isMessageDeletedDisabled", false);
		}
	}

	/**
	 * Set a command cooldown in a channel
	 * @param {Document} serverDocument
	 * @param {Document} channelDocument
	 * @param {Query} channelQueryDocument
	 */
	async setCooldown (serverDocument, channelDocument, channelQueryDocument) {
		if (channelDocument.command_cooldown > 0 || serverDocument.config.command_cooldown > 0) {
			channelQueryDocument.set("isCommandCooldownOngoing", true);
			// End cooldown after interval (favor channel config over server)
			this.client.setTimeout(async () => {
				const newServerDocument = await Servers.findOne(serverDocument._id);
				const newChannelDocument = newServerDocument.query.id("channels", channelDocument._id);
				newChannelDocument.set("isCommandCooldownOngoing", false);
				await newServerDocument.save().catch(err => {
					logger.debug(`Failed to save server data for command cooldown...`, { svrid: serverDocument._id }, err);
					this.client.logMessage(serverDocument, LoggingLevels.WARN, `Failed to save server data for command cooldown!`);
				});
			}, channelDocument.command_cooldown || serverDocument.config.command_cooldown);
		}
	}

	/**
	 * Increment command usage count
	 * @param {Document} serverDocument
	 * @param {?String} command
	 */
	async incrementCommandUsage (serverDocument, command) {
		const serverQueryDocument = serverDocument.query;

		if (!serverDocument.command_usage) {
			serverQueryDocument.set("command_usage", {});
		}

		if (serverDocument.command_usage[command] === null || isNaN(serverDocument.command_usage[command])) {
			serverQueryDocument.set(`command_usage.${command}`, 0);
		}

		serverQueryDocument.inc(`command_usage.${command}`);
	}
}

module.exports = MessageCreate;
