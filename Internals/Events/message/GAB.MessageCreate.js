/* eslint-disable max-len, max-depth */
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
const { LoggingLevels } = Constants;
const snekfetch = require("snekfetch");

class MessageCreate extends BaseEvent {
	requirements (msg) {
		if (msg.author.id === this.bot.user.id || msg.author.bot || this.configJSON.userBlocklist.includes(msg.author.id)) {
			if (msg.author.id === this.bot.user.id) {
				return false;
			} else {
				winston.silly(`Ignored ${msg.author.tag}.`, { usrid: msg.author.id, globallyBlocked: this.configJSON.userBlocklist.includes(msg.author.id) });
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
			if (this.bot.messageListeners[msg.channel.id] && this.bot.messageListeners[msg.channel.id][msg.author.id]) {
				if (msg.content.toLowerCase().trim() === "quit") {
					this.bot.messageListeners[msg.channel.id][msg.author.id].reject(new GABError("AWAIT_QUIT"));
					this.bot.deleteAwaitPMMessage(msg.channel, msg.author);
				} else if (this.bot.messageListeners[msg.channel.id][msg.author.id].filter(msg)) {
					this.bot.messageListeners[msg.channel.id][msg.author.id].resolve(msg);
					this.bot.deleteAwaitPMMessage(msg.channel, msg.author);
				}
				return;
			}
			// Forward PM to maintainer(s) if enabled
			if (!this.configJSON.maintainers.includes(msg.author.id) && this.configJSON.pmForward) {
				let url = "";
				if (msg.content.length >= 1950) {
					const GistUpload = new Gist(this.bot);
					const res = await GistUpload.upload({
						title: "Bot DM",
						text: msg.content,
					});
					if (res.url) {
						url = res.url;
					}
				}
				for (const maintainerID of this.configJSON.maintainers) {
					let user = this.bot.users.get(maintainerID);
					if (!user) {
						user = await this.bot.users.fetch(maintainerID, true);
					}
					user.send({
						embed: {
							color: 0x3669FA,
							author: {
								name: `${msg.author.tag} just sent me a PM!`,
								icon_url: msg.author.displayAvatarURL(),
							},
							description: `${url !== "" ? `The message was too large! You can read it [here](${url}). 📨` : `\`\`\`${msg.content}\`\`\``}`,
						},
					});
				}
			}
			const commandFunction = this.bot.getPMCommand(msg.command);
			if (commandFunction) {
				const userDocument = (await Users.findOrCreate({ _id: msg.author.id })).doc;
				msg.author.userDocument = userDocument;
				winston.verbose(`Treating "${msg.cleanContent}" as a PM command`, { usrid: msg.author.id, cmd: msg.command, suffix: msg.suffix });
				try {
					await commandFunction({
						bot: this.bot,
						client: this.client,
						configJS: this.configJS,
						utils: Utils,
						Utils,
						Constants,
					}, msg, {
						name: msg.command,
						usage: this.bot.getPMCommandMetadata(msg.command).usage,
					});
				} catch (err) {
					winston.warn(`Failed to process PM command "${msg.command}"`, { usrid: msg.author.id }, err);
					msg.author.send({
						embed: {
							color: 0xFF0000,
							title: `Something went wrong! 😱`,
							description: `**Error Message**: \`\`\`js\n${err.stack}\`\`\``,
							footer: {
								text: `Contact your Server Admin for support!`,
							},
						},
					});
				}
				await msg.author.userDocument.save().catch(err => {
					winston.verbose(`Failed to save user document...`, err);
				});
			} else if (!this.bot.getSharedCommand(msg.command)) {
				// Process chatterbot prompt
				winston.verbose(`Treating "${msg.cleanContent}" as a PM chatterbot prompt`, { usrid: msg.author.id });
				const m = await msg.channel.send({
					embed: {
						color: 0x3669FA,
						description: `The chatter bot is thinking...`,
					},
				});
				const response = await this.chatterPrompt(msg.author.id, msg.cleanContent).catch(err => {
					winston.verbose(`Failed to get chatter prompt.`, err);
					m.edit({
						embed: {
							color: 0xFF0000,
							description: `Sorry, I didn't catch that. Could you repeat yourself?`,
						},
					});
				});
				if (response) {
					await m.edit({
						embed: {
							title: `The Program-O Chatter Bot replied with:`,
							url: `https://program-o.com`,
							description: response,
							thumbnail: {
								url: `https://cdn.program-o.com/images/program-o-luv-bunny.png`,
							},
							color: 0x00FF00,
						},
					});
				}
			}
		} else {
			// Handle public messages
			const serverDocument = await this.bot.cache.get(msg.guild.id);
			if (serverDocument) {
				// Get channel data
				let channelDocument = serverDocument.channels.id(msg.channel.id);
				// Create channel data if not found
				if (!channelDocument) {
					serverDocument.channels.push({ _id: msg.channel.id });
					channelDocument = serverDocument.channels.id(msg.channel.id);
				}
				// Get member data (for this server)
				let memberDocument = serverDocument.members.id(msg.author.id);
				// Create member data if not found
				if (!memberDocument) {
					serverDocument.members.push({ _id: msg.author.id });
					memberDocument = serverDocument.members.id(msg.author.id);
				}
				const memberBotAdminLevel = this.bot.getUserBotAdmin(msg.guild, serverDocument, msg.member);
				// Increment today's message count for server
				serverDocument.messages_today++;
				// Count server stats if enabled in this channel
				if (channelDocument.isStatsEnabled) {
					// Increment this week's message count for member
					memberDocument.messages++;
					// Set now as the last active time for member
					memberDocument.last_active = Date.now();
					// Check if the user has leveled up a rank
					this.bot.checkRank(msg.guild, serverDocument, msg.member, memberDocument);
				}

				// Check for start command from server admin
				if (!channelDocument.bot_enabled && memberBotAdminLevel > 1) {
					if (msg.command === "start") {
						channelDocument.bot_enabled = true;
						let inAllChannels = false;
						if (msg.suffix && msg.suffix.toLowerCase().trim() === "all") {
							inAllChannels = true;
							serverDocument.channels.forEach(targetChannelDocument => {
								targetChannelDocument.bot_enabled = true;
							});
						}
						msg.channel.send({
							embed: {
								color: 0x3669FA,
								description: `Hello! I'm back${inAllChannels ? " in all channels" : ""}! 🐬`,
							},
						});
						this.bot.logMessage(serverDocument, LoggingLevels.INFO, `I was reactivated in ${inAllChannels ? "all channels!" : "a channel."}`, msg.channel.id, msg.author.id);
						return;
					}
				}

				// TODO: Move this lel
				// Check if using a filtered word
				if (checkFiltered(serverDocument, msg.channel, msg.content, false, true)) {
					// Delete offending message if necessary
					if (serverDocument.config.moderation.filters.custom_filter.delete_message) {
						try {
							await msg.delete();
						} catch (err) {
							winston.verbose(`Failed to delete filtered message from member "${msg.author.tag}" in channel ${msg.channel.name} on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
							this.bot.logMessage(serverDocument, LoggingLevels.WARN, `I failed to delete a message containing a filtered word x.x`, msg.channel.id, msg.author.id);
						}
					}
					// Get user data
					const findDocument = await Users.findOrCreate({ _id: msg.author.id }).catch(err => {
						winston.verbose("Failed to find or create user data for message filter violation", { usrid: msg.author.id }, err);
					});
					const userDocument = findDocument && findDocument.doc;
					if (userDocument) {
						// Handle this as a violation
						let violatorRoleID = null;
						if (!isNaN(serverDocument.config.moderation.filters.custom_filter.violator_role_id) && !msg.member.roles.has(serverDocument.config.moderation.filters.custom_filter.violator_role_id)) {
							violatorRoleID = serverDocument.config.moderation.filters.custom_filter.violator_role_id;
						}
						this.bot.handleViolation(msg.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You used a filtered word in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `**@${this.bot.getName(msg.guild, serverDocument, msg.member, true)}** used a filtered word (\`${msg.cleanContent}\`) in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `Word filter violation ("${msg.cleanContent}") in #${msg.channel.name} (${msg.channel})`, serverDocument.config.moderation.filters.custom_filter.action, violatorRoleID);
					}
					await userDocument.save().catch(err => {
						winston.verbose(`Failed to save user document...`, err);
					});
				}

				// Mention filter
				if (serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.filters.mention_filter.isEnabled && !serverDocument.config.moderation.filters.mention_filter.disabled_channel_ids.includes(msg.channel.id) && memberBotAdminLevel < 1) {
					let totalMentions = msg.mentions.members ? msg.mentions.members.size : msg.mentions.users.size + msg.mentions.roles.size;
					if (serverDocument.config.moderation.filters.mention_filter.include_everyone && msg.mentions.everyone) totalMentions++;

					// Check if mention count is higher than threshold
					if (totalMentions > serverDocument.config.moderation.filters.mention_filter.mention_sensitivity) {
						winston.verbose(`Handling mention spam from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });

						// Delete message if necessary
						if (serverDocument.config.moderation.filters.mention_filter.delete_message) {
							try {
								await msg.delete();
							} catch (err) {
								winston.debug(`Failed to delete filtered mention spam message from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
							}
						}

						// Get user data
						const findDocument = await Users.findOrCreate({ _id: msg.author.id }).catch(err => {
							winston.debug(`Failed to find or create user data for message mention filter violation`, { usrid: msg.author.id }, err);
						});
						const userDocument = findDocument && findDocument.doc;
						if (userDocument) {
							// Handle this as a violation
							let violatorRoleID = null;
							if (!isNaN(serverDocument.config.moderation.filters.mention_filter.violator_role_id) && !msg.member.roles.has(serverDocument.config.moderation.filters.mention_filter.violator_role_id)) {
								violatorRoleID = serverDocument.config.moderation.filters.spam_filter.violator_role_id;
							}
							this.bot.handleViolation(msg.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You put ${totalMentions} mentions in a message in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `**@${this.bot.getName(msg.guild, serverDocument, msg.member, true)}** mentioned ${totalMentions} members / roles in a message in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `Mention spam (${totalMentions} members / roles) in #${msg.channel.name} (${msg.channel})`, serverDocument.config.moderation.filters.mention_filter.action, violatorRoleID);
						}
						await userDocument.save().catch(err => {
							winston.debug(`Failed to save user document...`, err);
						});
					}
				}

				// TODO: Move this?
				// Only keep responding if the bot is on in the channel and author isn't blocked on the server
				if (channelDocument.bot_enabled && !serverDocument.config.blocked.includes(msg.author.id)) {
					// Translate message if necessary
					const translatedDocument = serverDocument.config.translated_messages.id(msg.author.id);
					if (translatedDocument) {
						// Detect the language (not always accurate; used only to exclude English messages from being translated to English)
						mstranslate.detect({ text: msg.cleanContent }, (err, res) => {
							if (err) {
								winston.debug(`Failed to auto-detect language for message "${msg.cleanContent}" from member "${msg.author.tag}" on server "${msg.guild}"`, { svrid: msg.guild.id, usrid: msg.author.id }, err);
								this.bot.logMessage(serverDocument, LoggingLevels.WARN, `Failed to auto-detect language for message "${msg.cleanContent}" from member "${msg.author.tag}"`, msg.channel.id, msg.author.id);
							} else if (res.toLowerCase() !== "en") {
								// If the message is not in English, attempt to translate it from the language defined for the user
								mstranslate.translate({ text: msg.cleanContent, from: translatedDocument.source_language, to: "EN" }, (translateErr, translateRes) => {
									if (translateErr) {
										winston.debug(`Failed to translate "${msg.cleanContent}" from member "${msg.author.tag}" on server "${msg.guild}"`, { svrid: msg.channel.guild.id, usrid: msg.author.id }, translateErr);
										this.bot.logMessage(serverDocument, LoggingLevels.WARN, `Failed to translate "${msg.cleanContent}" from member "${msg.author.tag}"`, msg.channel.id, msg.author.id);
									} else {
										msg.channel.send({
											embed: {
												color: 0x3669FA,
												title: `**@${this.bot.getName(msg.channel.guild, serverDocument, msg.member)}** said:`,
												description: `\`\`\`${translateRes}\`\`\``,
												footer: {
													text: `Translated using Microsoft Translator. The translated text might not be accurate!`,
												},
											},
										});
									}
								});
							}
						});
					}

					// Only keep responding if there isn't an ongoing command cooldown in the channel
					if (!channelDocument.isCommandCooldownOngoing || memberBotAdminLevel > 0) {
						// Check if message is a command, tag command, or extension trigger
						let cmd;
						if (msg.command !== null) {
							cmd = this.client.getPublicCommandName(msg.command);
							if (!cmd) cmd = msg.command;
						}
						if (msg.command !== null && cmd !== null && this.bot.getPublicCommandMetadata(cmd) &&
								serverDocument.config.commands[cmd].isEnabled &&
								(this.bot.getPublicCommandMetadata(cmd).adminExempt || memberBotAdminLevel >= serverDocument.config.commands[cmd].admin_level) &&
								!serverDocument.config.commands[cmd].disabled_channel_ids.includes(msg.channel.id)) {
							// Increment command usage count
							this.incrementCommandUsage(serverDocument, cmd);
							// Get User data
							const findDocument = await Users.findOrCreate({ _id: msg.author.id }).catch(err => {
								winston.debug(`Failed to find or create user data for message`, { usrid: msg.author.id }, err);
							});
							const userDocument = findDocument && findDocument.doc;
							if (userDocument) {
								// NSFW filter for command suffix
								if (memberBotAdminLevel < 1 && this.bot.getPublicCommandMetadata(cmd).defaults.isNSFWFiltered && checkFiltered(serverDocument, msg.channel, msg.suffix, true, false)) {
									// Delete offending message if necessary
									if (serverDocument.config.moderation.filters.nsfw_filter.delete_message) {
										try {
											await msg.delete();
										} catch (err) {
											winston.debug(`Failed to delete NSFW command message from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
											this.bot.logMessage(serverDocument, LoggingLevels.WARN, `Failed to delete NSFW command message from member "${msg.author.tag}" in channel "${msg.channel.name}"`, msg.channel.id, msg.author.id);
										}
									}
									// Handle this as a violation
									let violatorRoleID = null;
									if (!isNaN(serverDocument.config.moderation.filters.nsfw_filter.violator_role_id) && !msg.member.roles.has(serverDocument.config.moderation.filters.nsfw_filter.violator_role_id)) {
										violatorRoleID = serverDocument.config.moderation.filters.nsfw_filter.violator_role_id;
									}
									this.bot.handleViolation(msg.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You tried to fetch NSFW content in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `**@${this.bot.getName(msg.guild, serverDocument, msg.member, true)}** tried to fetch NSFW content (\`${msg.cleanContent}\`) in #${msg.channel.name} (${msg.channel}) on ${msg.guild}`, `NSFW filter violation ("${msg.cleanContent}") in #${msg.channel.name} (${msg.channel})`, serverDocument.config.moderation.filters.nsfw_filter.action, violatorRoleID);
								} else {
									// Assume its a command, lets run it!
									winston.verbose(`Treating "${msg.cleanContent}" as a command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
									this.bot.logMessage(serverDocument, LoggingLevels.INFO, `Treating "${msg.cleanContent}" as a command`, msg.channel.id, msg.author.id);
									this.deleteCommandMessage(serverDocument, channelDocument, msg);
									try {
										const botObject = {
											bot: this.bot,
											client: this.client,
											configJS: this.configJS,
											utils: Utils,
											Utils,
											Constants,
										};
										const documents = {
											serverDocument,
											channelDocument,
											memberDocument,
											userDocument,
										};
										const commandData = {
											name: this.client.getPublicCommandName(msg.command),
											usage: this.bot.getPublicCommandMetadata(cmd).usage,
											description: this.bot.getPublicCommandMetadata(cmd).description,
										};
										await this.bot.getPublicCommand(cmd)(botObject, documents, msg, commandData);
									} catch (err) {
										winston.warn(`Failed to process command "${cmd}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
										this.bot.logMessage(serverDocument, LoggingLevels.ERROR, `Failed to process command "${cmd}" X.X`, msg.channel.id, msg.author.id);
										msg.channel.send({
											embed: {
												color: 0xFF0000,
												title: `Something went wrong! 😱`,
												description: `Something went wrong while executing \`${cmd}\`!\n**Error Message**: \`\`\`js\n${err.stack}\`\`\``,
												footer: {
													text: `Contact your GAB maintainer for more support.`,
												},
											},
										});
									}
									await this.setCooldown(serverDocument, channelDocument);
								}
								await userDocument.save().catch(err => {
									winston.verbose(`Failed to save user document...`, err);
								});
							}
							// Check if it's a trigger for a tag command
						} else if (serverDocument.config.tags.list.id(msg.command) && serverDocument.config.tags.list.id(msg.command).isCommand) {
							winston.verbose(`Treating "${msg.cleanContent}" as a tag command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
							this.bot.logMessage(serverDocument, LoggingLevels.INFO, `Treating "${msg.cleanContent}" as a tag command`, msg.channel.id, msg.author.id);
							this.deleteCommandMessage(serverDocument, channelDocument, msg);
							msg.channel.send(`${serverDocument.config.tags.list.id(msg.command).content}`, {
								disableEveryone: true,
							});
							await this.setCooldown(serverDocument, channelDocument);
						} else {
							// Check if it's a command or keyword extension trigger
							let extensionApplied = false;
							for (let i = 0; i < serverDocument.extensions.length; i++) {
								if (memberBotAdminLevel >= serverDocument.extensions[i].admin_level && serverDocument.extensions[i].enabled_channel_ids.includes(msg.channel.id)) {
									// Command extensions
									if (serverDocument.extensions[i].type === "command" && msg.command && msg.command === serverDocument.extensions[i].key) {
										winston.verbose(`Treating "${msg.cleanContent}" as a trigger for command extension "${serverDocument.extensions[i].name}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, extid: serverDocument.extensions[i]._id });
										this.bot.logMessage(serverDocument, LoggingLevels.INFO, `Treating "${msg.cleanContent}" as a trigger for command extension "${serverDocument.extensions[i].name}"`, msg.channel.id, msg.author.id);
										extensionApplied = true;

										// Do the normal things for commands
										await Promise.all([this.incrementCommandUsage(serverDocument, msg.command), this.deleteCommandMessage(serverDocument, channelDocument, msg), this.setCooldown(serverDocument, channelDocument)]);
										// TODO: runExtension(bot, db, msg.guild, serverDocument, msg.channel, serverDocument.extensions[i], msg, commandObject.suffix, null);
									} else if (serverDocument.extensions[i].type === "keyword") {
										const keywordMatch = msg.content.containsArray(serverDocument.extensions[i].keywords, serverDocument.extensions[i].case_sensitive);
										if (((serverDocument.extensions[i].keywords.length > 1 || serverDocument.extensions[i].keywords[0] !== "*") && keywordMatch.selectedKeyword > -1) || (serverDocument.extensions[i].keywords.length === 1 && serverDocument.extensions[i].keywords[0] === "*")) {
											winston.verbose(`Treating "${msg.cleanContent}" as a trigger for keyword extension "${serverDocument.extensions[i].name}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, extid: serverDocument.extensions[i]._id });
											this.bot.logMessage(serverDocument, LoggingLevels.INFO, `Treating "${msg.cleanContent}" as a trigger for keyword extension "${serverDocument.extensions[i].name}"`, msg.channel.id, msg.author.id);
											// TODO: runExtension(bot, db, msg.guild, serverDocument, msg.channel, serverDocument.extensions[i], msg, null, keywordMatch);
										}
									}
								}
							}
							const prompt = msg.content.split(/\s+/)
								.splice(1)
								.join(" ")
								.trim();
							let shouldRunChatterbot = true;
							if ((msg.content.startsWith(`<@${this.bot.user.id}>`) || msg.content.startsWith(`<@!${this.bot.user.id}>`)) && msg.content.includes(" ") && msg.content.length > msg.content.indexOf(" ") && !this.bot.getSharedCommand(msg.command) && prompt.toLowerCase().trim() === "help") {
								msg.channel.send({
									embed: {
										color: 0x3669FA,
										title: `Hey there, it seems like you are lost!`,
										description: `Use \`${msg.guild.commandPrefix}help\` to learn how to use me on this server! 😄`,
									},
								});
								shouldRunChatterbot = false;
							}
							// Check if it's a chatterbot prompt
							if (!extensionApplied && shouldRunChatterbot && serverDocument.config.chatterbot.isEnabled && !serverDocument.config.chatterbot.disabled_channel_ids.includes(msg.channel.id) && (msg.content.startsWith(`<@${this.bot.user.id}>`) || msg.content.startsWith(`<@!${this.bot.user.id}>`)) && msg.content.includes(" ") && msg.content.length > msg.content.indexOf(" ") && !this.bot.getSharedCommand(msg.command)) {
								await this.setCooldown(serverDocument, channelDocument);
								winston.verbose(`Treating "${msg.cleanContent}" as a chatterbot prompt`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
								this.bot.logMessage(serverDocument, LoggingLevels.INFO, `Treating "${msg.cleanContent}" as a chatterbot prompt`, msg.channel.id, msg.author.id);
								const m = await msg.channel.send({
									embed: {
										color: 0x3669FA,
										description: `The chatter bot is thinking...`,
									},
								});
								const response = await this.chatterPrompt(msg.author.id, prompt).catch(err => {
									winston.verbose(`Failed to get chatter prompt.`, err);
									m.edit({
										embed: {
											color: 0xFF0000,
											description: `Sorry, I didn't catch that. Could you repeat yourself?`,
										},
									});
								});
								if (response) {
									await m.edit({
										embed: {
											title: `The Program-O Chatter Bot replied with:`,
											url: `https://program-o.com`,
											description: response,
											thumbnail: {
												url: `https://cdn.program-o.com/images/program-o-luv-bunny.png`,
											},
											color: 0x00FF00,
										},
									});
								}
							} else if (!extensionApplied && msg.mentions.members.find(mention => mention.id === this.bot.user.id) && serverDocument.config.tag_reaction.isEnabled) {
								const random = serverDocument.config.tag_reaction.messages.random.replaceAll("@user", `**@${this.bot.getName(msg.guild, serverDocument, msg.member)}**`).replaceAll("@mention", `<@!${msg.author.id}>`);
								if (random) {
									msg.channel.send(random);
								} else {
									msg.channl.send({
										embed: {
											color: 0xFF0000,
											title: `Uh-oh`,
											description: `Something went wrong! 😱`,
											footer: {
												text: `Contact your server Admins for more support.`,
											},
										},
									});
								}
							}
						}
					}
				}
			}
		}
		// Console.log(`Time for CommandHandler took: ${process.hrtime(proctime)[0]}s ${Math.floor(process.hrtime(proctime)[1] / 1000000)}ms`);
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
			res = await snekfetch.get(`http://api.program-o.com/v2/chatbot/`).query({
				bot_id: 6,
				say: encodeURIComponent(prompt),
				convo_id: userOrUserID.id ? userOrUserID.id : userOrUserID,
				format: "json",
			}).set({
				Accept: "application/json",
				"User-Agent": "GAwesomeBot (https://github.com/GilbertGobbels/GAwesomeBot)",
			});
		} catch (err) {
			throw err;
		}
		let response;
		if (res.status === 200 && res.body) {
			response = JSON.parse(res.body).botsay
				.replaceAll("Program-O", this.bot.user.username)
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
	 * @param {Document} channelDocument
	 * @param {Message} msg
	 */
	async deleteCommandMessage (serverDocument, channelDocument, msg) {
		if (serverDocument.config.delete_command_messages && msg.channel.permissionsFor(msg.guild.me).has("MANAGE_MESSAGES")) {
			channelDocument.isMessageDeletedDisabled = true;
			try {
				await msg.delete();
			} catch (err) {
				winston.debug(`Failed to delete command message..`, err);
				this.bot.logMessage(serverDocument, LoggingLevels.WARN, `Failed to delete command message in channel`, msg.channel.id, msg.author.id);
			}
			channelDocument.isMessageDeletedDisabled = false;
		}
	}

	/**
	 * Set a command cooldown in a channel
	 * @param {Document} serverDocument
	 * @param {Document} channelDocument
	 */
	async setCooldown (serverDocument, channelDocument) {
		if (channelDocument.command_cooldown > 0 || serverDocument.config.command_cooldown > 0) {
			channelDocument.isCommandCooldownOngoing = true;
			// End cooldown after interval (favor channel config over server)
			this.bot.setTimeout(async () => {
				channelDocument.isCommandCooldownOngoing = false;
				await serverDocument.save().catch(err => {
					winston.debug(`Failed to save server data for command cooldown...`, { svrid: serverDocument._id }, err);
					this.bot.logMessage(serverDocument, LoggingLevels.WARN, `Failed to save server data for command cooldown!`);
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
		if (!serverDocument.command_usage) {
			serverDocument.command_usage = {};
		}

		if (serverDocument.command_usage[command] === null || isNaN(serverDocument.command_usage[command])) {
			serverDocument.command_usage[command] = 0;
		}

		serverDocument.command_usage[command]++;
		serverDocument.markModified("command_usage");
	}
}

module.exports = MessageCreate;
