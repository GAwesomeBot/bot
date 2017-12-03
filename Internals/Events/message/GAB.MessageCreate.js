/* eslint-disable max-len, max-depth */
const BaseEvent = require("../BaseEvent.js");
const { MicrosoftTranslate: mstranslate, Utils } = require("../../../Modules/");
const {
	Gist,
	FilterChecker: checkFiltered,
	RegExpMaker,
} = Utils;
const snekfetch = require("snekfetch");

class MessageCreate extends BaseEvent {
	requirements (msg) {
		if (msg.author.id === this.bot.user.id || msg.author.bot || this.configJSON.globalBlocklist.includes(msg.author.id)) {
			if (msg.author.id === this.bot.user.id) {
				return false;
			} else {
				winston.silly(`Ignored ${msg.author.tag}.`, { usrid: msg.author.id, globallyBlocked: this.configJSON.globalBlocklist.includes(msg.author.id) });
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
							description: `${url !== "" ? `The message was too large! Please go [here](${url}) to read it. 📨` : `\`\`\`${msg.content}\`\`\``}`,
						},
					});
				}
			}
			let command = msg.content.toLowerCase().trim();
			let suffix = "";
			if (command.includes(" ")) {
				command = command.split(/\s+/)[0].toLowerCase().trim();
				suffix = msg.content.split(/\s+/)
					.splice(1)
					.join(" ")
					.trim();
			}
			const commandFunction = this.bot.getPMCommand(command);
			if (commandFunction) {
				winston.verbose(`Treating "${msg.cleanContent}" as a PM command`, { usrid: msg.author.id, cmd: command });
				const findDocument = await Users.findOrCreate({ _id: msg.author.id }).catch(err => {
					winston.warn("Failed to find or create user data for message", { usrid: msg.author.id }, err);
				});
				const userDocument = findDocument && findDocument.doc;
				try {
					await commandFunction({
						bot: this.bot,
						configJS: this.configJS,
						configJSON: this.configJSON,
						utils: Utils,
						Utils,
					}, userDocument, msg, suffix, {
						name: command,
						usage: this.bot.getPMCommandMetadata(command).usage,
					});
				} catch (err) {
					winston.warn(`Failed to process PM command "${command}"`, { usrid: msg.author.id }, err);
					msg.author.send({
						embed: {
							color: 0xFF0000,
							title: `Something went wrong! 😱`,
							description: `**Error Message**: \`\`\`js\n${err.stack}\`\`\``,
							footer: {
								text: `You should report this on GitHub so we can fix it!`,
							},
						},
					});
				}
				await userDocument.save().catch(err => {
					winston.verbose(`Failed to save user document...`, err);
				});
			} else {
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
							description: `Failed to get an answer, ok?!`,
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
			const serverDocument = this.bot.cache.get(msg.guild.id);
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
					const startCommand = await this.bot.checkCommandTag(msg.content, serverDocument);
					if (startCommand && startCommand.command === "start") {
						channelDocument.bot_enabled = true;
						let inAllChannels = false;
						if (startCommand.suffix.toLowerCase().trim() === "all") {
							inAllChannels = true;
							serverDocument.channels.forEach(targetChannelDocument => {
								targetChannelDocument.bot_enabled = true;
							});
						}
						await serverDocument.save().catch(err => {
							winston.warn(`Failed to save server data for bot enable..`, { svrid: msg.guild.id }, err);
						});
						msg.channel.send({
							embed: {
								color: 0x3669FA,
								description: `Hello! I'm back${inAllChannels ? " in all channels" : ""}! 🐬`,
							},
						});
						this.bot.logMessage(serverDocument, "info", `I was reactivated in ${inAllChannels ? "all channels!" : "a channel."}`, msg.channel.id, msg.author.id);
						return;
					}
				}

				// Check for eval command from maintainers
				if (this.configJSON.maintainers.includes(msg.author.id)) {
					const evalCommand = await this.bot.checkCommandTag(msg.content, serverDocument);
					if (evalCommand && (evalCommand.command === "eval" || evalCommand.command === "ev")) {
						if (evalCommand.suffix) {
							let hrstart = process.hrtime();
							try {
								if (evalCommand.suffix.startsWith("```js") && evalCommand.suffix.endsWith("```")) evalCommand.suffix = evalCommand.suffix.substring(5, evalCommand.suffix.length - 3);
								const asyncEval = (code, returns) => `(async () => {\n${!returns ? `return ${code.trim()}` : `${code.trim()}`}\n})()`;
								evalCommand.suffix = evalCommand.suffix
									.replace("this.bot.token", "\"mfaNop\"")
									.replace(/\.(clientToken|clientSecret|discordList|discordBots|discordBotsOrg|giphyAPI|googleCSEID|googleAPI|imgurClientID|microsoftTranslation|twitchClientID|wolframAppID|openExchangeRatesKey|omdbAPI|gistKey)/g, "mfaNop");
								let { discord, tokens } = require("../../../Configurations/auth");
								const censor = [
									discord.clientSecret,
									discord.clientToken,
									tokens.discordList,
									tokens.discordBots,
									tokens.discordBotsOrg,
									tokens.giphyAPI,
									tokens.googleCSEID,
									tokens.googleAPI,
									tokens.imgurClientID,
									tokens.microsoftTranslation,
									tokens.twitchClientID,
									tokens.wolframAppID,
									tokens.openExchangeRatesKey,
									tokens.omdbAPI,
									tokens.gistKey,
								];
								const regex = new RegExpMaker(censor).make("gi");
								let result = await eval(asyncEval(evalCommand.suffix, evalCommand.suffix.includes("return")));
								if (typeof result !== "string") result = require("util").inspect(result, false, 1);
								result = result.replace(regex, "-- GAB SNIP --");
								if (result.length <= 1980) {
									msg.channel.send({
										embed: {
											color: 0x00FF00,
											description: `\`\`\`js\n${result}\`\`\``,
											footer: {
												text: `Execution time: ${process.hrtime(hrstart)[0]}s ${Math.floor(process.hrtime(hrstart)[1] / 1000000)}ms`,
											},
										},
									});
								} else {
									const GistUpload = new Gist(this.bot);
									const res = await GistUpload.upload({
										title: "Eval Result",
										text: result,
									});
									res && res.url && msg.channel.send({
										embed: {
											color: 0x3669FA,
											title: `The eval results were too large!`,
											description: `As such, I've uploaded them to a gist. Check them out [here](${res.url})`,
										},
									});
								}
							} catch (err) {
								msg.channel.send({
									embed: {
										color: 0xFF0000,
										description: `\`\`\`js\n${err.stack}\`\`\``,
										footer: {
											text: `Execution time: ${process.hrtime(hrstart)[0]}s ${Math.floor(process.hrtime(hrstart)[1] / 1000000)}ms`,
										},
									},
								});
							}
						} else {
							msg.channel.send({
								embed: {
									color: 0xFF0000,
									description: `What would you like to evaluate?`,
									footer: {
										text: `Come on, give me something to work with!`,
									},
								},
							});
						}
						return;
					}
				}

				// TODO: Move this lel
				// Check if using a filtered word
				if (checkFiltered(serverDocument, msg.channel, msg.content, false, true)) {
					// Delete offending message if necessary
					if (serverDocument.config.moderation.filters.custom_filter.delete_message) {
						try {
							msg.delete();
						} catch (err) {
							winston.verbose(`Failed to delete filtered message from member "${msg.author.tag}" in channel ${msg.channel.name} on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
							this.bot.logMessage(serverDocument, "warn", `I failed to delete a message containing a filtered word x.x`, msg.channel.id, msg.author.id);
						}
					}
					// Get user data
					const findDocument = await Users.findOrCreate({ _id: msg.author.id }).catch(err => {
						winston.verbose("Failed to find or create user data for message filter violation", { usrid: msg.author.id }, err);
					});
					const userDocument = findDocument.doc;
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
								msg.delete();
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
								this.bot.logMessage(serverDocument, "warn", `Failed to auto-detect language for message "${msg.cleanContent}" from member "${msg.author.tag}"`, msg.channel.id, msg.author.id);
							} else if (res.toLowerCase() !== "en") {
								// If the message is not in English, attempt to translate it from the language defined for the user
								mstranslate.translate({ text: msg.cleanContent, from: translatedDocument.source_language, to: "EN" }, (translateErr, translateRes) => {
									if (translateErr) {
										winston.debug(`Failed to translate "${msg.cleanContent}" from member "${msg.author.tag}" on server "${msg.guild}"`, { svrid: msg.channel.guild.id, usrid: msg.author.id }, translateErr);
										this.bot.logMessage(serverDocument, "warn", `Failed to translate "${msg.cleanContent}" from member "${msg.author.tag}"`, msg.channel.id, msg.author.id);
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
						const commandObject = await this.bot.checkCommandTag(msg.content, serverDocument);

						if (commandObject && commandObject.command !== null && this.bot.getPublicCommandMetadata(commandObject.command)	&&
								serverDocument.config.commands[commandObject.command].isEnabled &&
								(this.bot.getPublicCommandMetadata(commandObject.command).adminExempt || memberBotAdminLevel >= serverDocument.config.commands[commandObject.command].admin_level) &&
								!serverDocument.config.commands[commandObject.command].disabled_channel_ids.includes(msg.channel.id)) {
							// Increment command usage count
							this.incrementCommandUsage(serverDocument, commandObject.command);
							// Get User data
							const findDocument = await Users.findOrCreate({ _id: msg.author.id }).catch(err => {
								winston.debug(`Failed to find or create user data for message`, { usrid: msg.author.id }, err);
							});
							const userDocument = findDocument && findDocument.doc;
							if (userDocument) {
								// NSFW filter for command suffix
								if (memberBotAdminLevel < 1 && this.bot.getPublicCommandMetadata(commandObject.command).defaults.isNSFWFiltered && checkFiltered(serverDocument, msg.channel, commandObject.suffix, true, false)) {
									// Delete offending message if necessary
									if (serverDocument.config.moderation.filters.nsfw_filter.delete_message) {
										try {
											await msg.delete();
										} catch (err) {
											winston.debug(`Failed to delete NSFW command message from member "${msg.author.tag}" in channel "${msg.channel.name}" on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
											this.bot.logMessage(serverDocument, "info", `Failed to delete NSFW command message from member "${msg.author.tag}" in channel "${msg.channel.name}"`, msg.channel.id, msg.author.id);
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
									this.bot.logMessage(serverDocument, "info", `Treating "${msg.cleanContent}" as a command`, msg.channel.id, msg.author.id);
									this.deleteCommandMessage(serverDocument, channelDocument, msg);
									try {
										const botObject = {
											bot: this.bot,
											configJS: this.configJS,
											configJSON: this.configJSON,
											utils: Utils,
											Utils,
										};
										const documents = {
											serverDocument,
											channelDocument,
											memberDocument,
											userDocument,
										};
										const commandData = {
											name: commandObject.command,
											usage: this.bot.getPublicCommandMetadata(commandObject.command).usage,
											description: this.bot.getPublicCommandMetadata(commandObject.command).description,
										};
										await this.bot.getPublicCommand(commandObject.command)(botObject, documents, msg, commandObject.suffix, commandData);
									} catch (err) {
										winston.warn(`Failed to process command "${commandObject.command}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
										this.bot.logMessage(serverDocument, "error", `Failed to process command "${commandObject.command}" X.X`, msg.channel.id, msg.author.id);
										msg.channel.send({
											embed: {
												color: 0xFF0000,
												title: `Something went wrong! 😱`,
												description: `I was unable to find the command file for \`${commandObject.command}\`!\n**Error Message**: \`\`\`js\n${err.stack}\`\`\``,
												footer: {
													text: `Contact your GAB maintainer for more support.`,
												},
											},
										});
									}
									await this.setCooldown(serverDocument, channelDocument);
								}
								await this.saveServerDocument(serverDocument);
								await userDocument.save().catch(err => {
									winston.verbose(`Failed to save user document...`, err);
								});
							}
							// Check if it's a trigger for a tag command
						} else if (commandObject && serverDocument.config.tags.list.id(commandObject.command) && serverDocument.config.tags.list.id(commandObject.command).isCommand) {
							winston.verbose(`Treating "${msg.cleanContent}" as a tag command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
							this.bot.logMessage(serverDocument, "info", `Treating "${msg.cleanContent}" as a tag command`, msg.channel.id, msg.author.id);
							this.deleteCommandMessage(serverDocument, channelDocument, msg);
							msg.channel.send(`${serverDocument.config.tags.list.id(commandObject.command).content}`, {
								disableEveryone: true,
							});
							await Promise.all([this.setCooldown(serverDocument, channelDocument), this.saveServerDocument(serverDocument)]);
						} else {
							// Check if it's a command or keyword extension trigger
							let extensionApplied = false;
							for (let i = 0; i < serverDocument.extensions.length; i++) {
								if (memberBotAdminLevel >= serverDocument.extensions[i].admin_level && serverDocument.extensions[i].enabled_channel_ids.includes(msg.channel.id)) {
									// Command extensions
									if (serverDocument.extensions[i].type === "command" && commandObject && commandObject.command && commandObject.command === serverDocument.extensions[i].key) {
										winston.verbose(`Treating "${msg.cleanContent}" as a trigger for command extension "${serverDocument.extensions[i].name}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, extid: serverDocument.extensions[i]._id });
										this.bot.logMessage(serverDocument, "info", `Treating "${msg.cleanContent}" as a trigger for command extension "${serverDocument.extensions[i].name}"`, msg.channel.id, msg.author.id);
										extensionApplied = true;

										// Do the normal things for commands
										await Promise.all([this.incrementCommandUsage(serverDocument, commandObject.command), this.deleteCommandMessage(serverDocument, channelDocument, msg), this.setCooldown(serverDocument, channelDocument)]);
										// TODO: runExtension(bot, db, msg.guild, serverDocument, msg.channel, serverDocument.extensions[i], msg, commandObject.suffix, null);
									} else if (serverDocument.extensions[i].type === "keyword") {
										const keywordMatch = msg.content.containsArray(serverDocument.extensions[i].keywords, serverDocument.extensions[i].case_sensitive);
										if (((serverDocument.extensions[i].keywords.length > 1 || serverDocument.extensions[i].keywords[0] !== "*") && keywordMatch.selectedKeyword > -1) || (serverDocument.extensions[i].keywords.length === 1 && serverDocument.extensions[i].keywords[0] === "*")) {
											winston.verbose(`Treating "${msg.cleanContent}" as a trigger for keyword extension "${serverDocument.extensions[i].name}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id, extid: serverDocument.extensions[i]._id });
											this.bot.logMessage(serverDocument, "info", `Treating "${msg.cleanContent}" as a trigger for keyword extension "${serverDocument.extensions[i].name}"`, msg.channel.id, msg.author.id);
											// TODO: runExtension(bot, db, msg.guild, serverDocument, msg.channel, serverDocument.extensions[i], msg, null, keywordMatch);
										}
									}
								}
							}

							if (extensionApplied) {
								this.saveServerDocument(serverDocument);
							}

							// Check if it's a chatterbot prompt
							if (!extensionApplied && serverDocument.config.chatterbot && (msg.content.startsWith(`<@${this.bot.user.id}>`) || msg.content.startsWith(`<@!${this.bot.user.id}>`)) && msg.content.includes(" ") && msg.content.length > msg.content.indexOf(" ")) {
								const prompt = msg.content.split(/\s+/)
									.splice(1)
									.join(" ")
									.trim();
								await Promise.all([this.setCooldown(serverDocument, channelDocument), this.saveServerDocument(serverDocument)]);
								// Default help response
								if (prompt.toLowerCase().trim() === "help") {
									msg.channel.send({
										embed: {
											color: 0x3669FA,
											title: `Hey there, it seems like you are lost!`,
											description: `Use \`${await this.bot.getCommandPrefix(msg.guild, serverDocument)}help\` for info about how to use me on this server! 😄`,
										},
									});
									// Process chatterbot prompt
								} else {
									winston.verbose(`Treating "${msg.cleanContent}" as a chatterbot prompt`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
									this.bot.logMessage(serverDocument, "info", `Treating "${msg.cleanContent}" as a chatterbot prompt`, msg.channel.id, msg.author.id);
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
												description: `Failed to get an answer, ok?!`,
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
							} else if (!extensionApplied && msg.mentions.members.find(mention => mention.id === this.bot.user.id) && serverDocument.config.tag_reaction.isEnabled) {
								const random = serverDocument.config.tag_reaction.messages.random().replaceAll("@user", `**@${this.bot.getName(msg.guild, serverDocument, msg.member)}**`).replaceAll("@mention", `<@!${msg.author.id}>`);
								if (random) {
									msg.channel.send(random);
								} else {
									msg.channl.send({
										embed: {
											color: 0xFF0000,
											title: `Woops!`,
											description: `Failed to get a random tag to place in chat.. 😱`,
										},
									});
								}
							}
						}
					} else {
						await this.saveServerDocument(serverDocument);
					}
				}
			}
		}
		// TODO: Remove this
		console.log(`Time for CommandHandler took: ${process.hrtime(proctime)[0]}s ${Math.floor(process.hrtime(proctime)[1] / 1000000)}ms`);
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
				.replaceAll("Elizabeth", "BitQuote");
		} else {
			response = "I don't feel like talking right now.. 😠";
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
				this.bot.logMessage(serverDocument, "warn", `Failed to delete command message in channel`, msg.channel.id, msg.author.id);
			}
			channelDocument.isMessageDeletedDisabled = false;
			await serverDocument.save();
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
					this.bot.logMessage(serverDocument, "warn", `Failed to save server data for command cooldown!`);
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

		if (serverDocument.command_usage[command] === null) {
			serverDocument.command_usage[command] = 0;
		}

		serverDocument.command_usage[command]++;
		serverDocument.markModified("command_usage");
	}

	/**
	 * Save any and all changes to the serverDocument
	 * @param {Document} serverDocument
	 */
	async saveServerDocument (serverDocument) {
		try {
			await serverDocument.save();
		} catch (err) {
			winston.debug(`Failed to save server data for message create...`, { svrid: serverDocument._id }, err);
		}
	}
}

module.exports = MessageCreate;