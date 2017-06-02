const checkFiltered = require("./../Modules/FilterChecker.js");
const mstranslate = require("./../Modules/MicrosoftTranslate.js");
const runExtension = require("./../Modules/ExtensionRunner.js");

const levenshtein = require("fast-levenshtein");
const unirest = require("unirest");

module.exports = (bot, db, config, winston, msg) => {
	// Load commands if necessary
	bot.reloadAllCommands();

	// Stop responding if user is a bot or is globally blocked
	if(msg.author.id==bot.user.id || msg.author.bot || config.global_blocklist.indexOf(msg.author.id)>-1) {
		return;
	}

	// Respond to message listener
	if(bot.messageListeners[msg.channel.id] && bot.messageListeners[msg.channel.id][msg.author.id]) {
		if(msg.content.toLowerCase()=="quit") {
			bot.removeMessageListener(msg.channel.id, msg.author.id);
			return;
		} else if(msg.content.trim() && bot.messageListeners[msg.channel.id][msg.author.id].filter(msg)) {
			bot.messageListeners[msg.channel.id][msg.author.id].callback(msg);
			bot.removeMessageListener(msg.channel.id, msg.author.id);
			return;
		}
	}

	// Talk to Program-O for a chatterbot response
	const chatterbotPrompt = (usrid, prompt, botname, callback) => {
		unirest.get(`http://api.program-o.com/v2/chatbot/?bot_id=6&say=${encodeURIComponent(prompt)}&convo_id=${usrid}&format=json`).headers({
			"Accept": "application/json",
			"User-Agent": "Unirest Node.js"
		}).end(res => {
			if(res.status==200 && res.body) {
				res = JSON.parse(res.body).botsay.replaceAll("Program-O", botname).replaceAll("<br/>", "\n").replaceAll("Elizabeth", "BitQuote");
			} else {
				res = "I don't feel like talking rn 😠";
			}
			callback(res);
		});
	};

	// Handle private messages
	if(!msg.channel.guild) {
		// Forward PM to maintainer(s) if enabled
		if(config.maintainers.indexOf(msg.author.id)==-1 && config.pm_forward) {
			for(let i=0; i<config.maintainers.length; i++) {
				const usr = bot.users.get(config.maintainers[i]);
				usr.getDMChannel().then(ch => {
					ch.createMessage(`**@${msg.author.username}** just sent me this PM 📨\`\`\`${msg.cleanContent}\`\`\``);
				});
			}
		}

		// Check if message is a PM command
		let command = msg.content.toLowerCase().trim();
		let suffix = "";
		if(command.indexOf(" ")>-1) {
			command = command.substring(0, command.indexOf(" "));
			suffix = msg.content.substring(msg.content.indexOf(" ")+1).trim();
		}
		const command_func = bot.getPMCommand(command);
		if(command_func) {
			winston.info(`Treating '${msg.cleanContent}' as a PM command`, {usrid: msg.author.id});

			// Get user data
			db.users.findOrCreate({_id: msg.author.id}, (err, userDocument) => {
				if(!err && userDocument) {
					try {
						command_func(bot, db, config, winston, userDocument, msg, suffix, {
							name: command,
							usage: bot.getPMCommandMetadata(command).usage
						});
					} catch(err) {
						winston.error(`Failed to process PM command '${command}'`, {usrid: msg.author.id}, err);
						msg.author.getDMChannel().then(ch => {
							ch.createMessage("Something went wrong 😱");
						});
					}
				} else {
					winston.error("Failed to find or create user data for message", {usrid: msg.author.id}, err);
				}
			});
			return;
		}

		// Process chatterbot prompt
		winston.info(`Treating '${msg.cleanContent}' as a chatterbot prompt`, {usrid: msg.author.id});
		chatterbotPrompt(msg.author.id, msg.cleanContent, bot.user.username, res => {
			msg.author.getDMChannel().then(ch => {
				ch.createMessage(res);
			});
		});
	// Handle public messages
	} else {
		// Get server data
		db.servers.findOne({_id: msg.channel.guild.id}, (err, serverDocument) => {
			if(!err && serverDocument) {
				// Get channel data
				let channelDocument = serverDocument.channels.id(msg.channel.id);
				// Create channel data if not found
				if(!channelDocument) {
					serverDocument.channels.push({_id: msg.channel.id});
					channelDocument = serverDocument.channels.id(msg.channel.id);
				}

				// Get member data (for this server)
				let memberDocument = serverDocument.members.id(msg.author.id);
				// Create member data if not found
				if(!memberDocument) {
					serverDocument.members.push({_id: msg.author.id});
					memberDocument = serverDocument.members.id(msg.author.id);
				}
				const memberBotAdmin = bot.getUserBotAdmin(msg.channel.guild, serverDocument, msg.member);

				// Increment today's message count for server
				serverDocument.messages_today++;
				// Count server stats if enabled in this channel
				if(channelDocument.isStatsEnabled) {
					// Increment this week's message count for member
					memberDocument.messages++;
					// Set now as the last active time for member
					memberDocument.last_active = Date.now();
					// Check if the user has leveled up a rank
					bot.checkRank(winston, msg.channel.guild, serverDocument, msg.member, memberDocument);

          // Save changes to serverDocument
          serverDocument.save(err => {
            if(err) {
              winston.error("Failed to save server data for messageCreated", {svrid: msg.channel.guild.id}, err);
            }
          });
				}

				// Check for start command from server admin
				if(!channelDocument.bot_enabled && memberBotAdmin>0) {
					const startCommand = bot.checkCommandTag(msg.content, serverDocument);
					if(startCommand && startCommand.command=="start") {
						channelDocument.bot_enabled = true;
						let str = "";
						if(startCommand.suffix.toLowerCase()=="all") {
							str = " in all channels";
							serverDocument.channels.forEach(targetChannelDocument => {
								targetChannelDocument.bot_enabled = true;
							});
						}
						serverDocument.save(err => {
							if(err) {
								winston.error("Failed to save server data for bot enabled", {svrid: msg.channel.guild._id}, err);
							}
						});
						msg.channel.createMessage(`Hello! 🐬 I'm back${str}`);
						return;
					}
				}

				// Check if using a filtered word
				if(checkFiltered(serverDocument, msg.channel, msg.cleanContent, false, true)) {
					// Delete offending message if necessary
					if(serverDocument.config.moderation.filters.custom_filter.delete_message) {
						msg.delete().then().catch(err => {
							winston.error(`Failed to delete filtered message from member '${msg.author.username}' in channel '${msg.channel.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
						});
					}

					// Get user data
					db.users.findOrCreate({_id: msg.author.id}, (err, userDocument) => {
						if(!err && userDocument) {
							// Handle this as a violation
							let violatorRoleID = null;
							if(!isNaN(serverDocument.config.moderation.filters.custom_filter.violator_role_id) && msg.member.roles.indexOf(serverDocument.config.moderation.filters.custom_filter.violator_role_id) ==-1){
								violatorRoleID = serverDocument.config.moderation.filters.custom_filter.violator_role_id;
							}
							bot.handleViolation(winston, msg.channel.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You used a filtered word in #${msg.channel.name} on ${msg.channel.guild.name}`, `**@${bot.getName(msg.channel.guild, serverDocument, msg.member, true)}** used a filtered word (\`${msg.cleanContent}\`) in #${msg.channel.name} on ${msg.channel.guild.name}`, `Word filter violation ("${msg.cleanContent}") in #${msg.channel.name}`, serverDocument.config.moderation.filters.custom_filter.action, violatorRoleID);
						} else {
							winston.error("Failed to find or create user data for message filter violation", {usrid: msg.author.id}, err);
						}
					});
				}

				// Spam filter
				if(serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.filters.spam_filter.isEnabled && serverDocument.config.moderation.filters.spam_filter.disabled_channel_ids.indexOf(msg.channel.id)==-1 && memberBotAdmin<1) {
					// Tracks spam with each new message (auto-delete after 45 seconds)
					let spamDocument = channelDocument.spam_filter_data.id(msg.author.id);
					if(!spamDocument) {
						channelDocument.spam_filter_data.push({_id: msg.author.id});
						spamDocument = channelDocument.spam_filter_data.id(msg.author.id);
						spamDocument.message_count++;
						spamDocument.last_message_content = msg.cleanContent;
						setTimeout(() => {
							db.servers.findOne({_id: msg.channel.guild.id}, (err, serverDocument) => {
								channelDocument = serverDocument.channels.id(msg.channel.id);
								spamDocument = channelDocument.spam_filter_data.id(msg.author.id);
								if(spamDocument) {
									spamDocument.remove();
									serverDocument.save(err => {
										if(err){
											winston.error("Failed to save server data for spam filter", {svrid: msg.channel.guild.id}, err);
										}
									});
								}
							});
						}, 45000);
					// Add this message to spamDocument if similar to the last one
					} else if(levenshtein.get(spamDocument.last_message_content, msg.cleanContent)<3) {
						spamDocument.message_count++;
						spamDocument.last_message_content = msg.cleanContent;

						// First-time spam filter violation
						if(spamDocument.message_count==serverDocument.config.moderation.filters.spam_filter.message_sensitivity) {
							winston.info(`Handling first-time spam from member '${msg.author.username}' on server '${msg.channel.guild.name}' in channel '${msg.channel.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});

							// Message user and tell them to stop
							msg.author.getDMChannel().then(ch => {
								ch.createMessage(`Stop spamming in #${msg.channel.name} on ${msg.channel.guild.name}. The chat moderators have been notified about this.`);
							});

							// Message bot admins about user spamming
							bot.messageBotAdmins(msg.channel.guild, serverDocument, `**@${bot.getName(msg.channel.guild, serverDocument, msg.member, true)}** is spamming in #${msg.channel.name} on ${msg.channel.guild.name}`);

							// Deduct 25 AwesomePoints if necessary
							if(serverDocument.config.commands.points.isEnabled) {
								// Get user data
								db.users.findOrCreate({_id: msg.author.id}, (err, userDocument) => {
									if(!err && userDocument) {
										userDocument.points -= 25;
										userDocument.save(err => {
											if(err) {
												winston.error("Failed to save user data for points", {usrid: msg.author.id}, err);
											}
										});
									}
								});
							}

							// Add strike for user
							memberDocument.strikes.push({
								_id: bot.user.id,
								reason: `First-time spam violation in #${msg.channel.name}`
							});
						// Second-time spam filter violation
						} else if(spamDocument.message_count==serverDocument.config.moderation.filters.spam_filter.message_sensitivity*2) {
							winston.info(`Handling second-time spam from member '${msg.author.username}' in channel '${msg.channel.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});

							// Delete spam messages if necessary
							if(serverDocument.config.moderation.filters.spam_filter.delete_messages) {
								bot.purgeChannel(msg.channel.id, 50, targetMessage => {
									return targetMessage.author.id==msg.author.id && levenshtein.get(spamDocument.last_message_content, targetMessage.cleanContent)<3;
								}).then().catch(err => {
									winston.error(`Failed to delete spam messages from member '${msg.author.username}' in channel '${msg.channel.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
								});
							}

							// Get user data
							db.users.findOrCreate({_id: msg.author.id}, (err, userDocument) => {
								if(!err && userDocument) {
									// Handle this as a violation
									let violatorRoleID = null;
									if(!isNaN(serverDocument.config.moderation.filters.spam_filter.violator_role_id) && msg.member.roles.indexOf(serverDocument.config.moderation.filters.spam_filter.violator_role_id) ==-1){
										violatorRoleID = serverDocument.config.moderation.filters.spam_filter.violator_role_id;
									}
									bot.handleViolation(winston, msg.channel.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You continued to spam in #${msg.channel.name} on ${msg.channel.guild.name}`, `**@${bot.getName(msg.channel.guild, serverDocument, msg.member, true)}** continues to spam in #${msg.channel.name} on ${msg.channel.guild.name}`, `Second-time spam violation in #${msg.channel.name}`, serverDocument.config.moderation.filters.spam_filter.action, violatorRoleID);
								} else {
									winston.error("Failed to find or create user data for message spam filter violation", {usrid: msg.author.id}, err);
								}
							});

							// Clear spamDocument, restarting the spam filter process
							spamDocument.remove();
						}
					}
					// Save spamDocument
					serverDocument.save(err => {
						if(err){
							winston.error("Failed to save server data for spam filter", {svrid: msg.channel.guild.id}, err);
						}
					});
				}

				// Mention filter
				if(serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.filters.mention_filter.isEnabled && serverDocument.config.moderation.filters.mention_filter.disabled_channel_ids.indexOf(msg.channel.id)==-1 && memberBotAdmin<1) {
					let totalMentions = msg.mentions.length + msg.roleMentions.length;
					if(serverDocument.config.moderation.filters.mention_filter.include_everyone && msg.mentionEveryone) totalMentions++;

					// Check if mention count is higher than threshold
					if(totalMentions>serverDocument.config.moderation.filters.mention_filter.mention_sensitivity) {
						winston.info(`Handling mention spam from member '${msg.author.username}' in channel '${msg.channel.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});

						// Delete message if necessary
						if(serverDocument.config.moderation.filters.mention_filter.delete_message) {
							msg.delete().then().catch(err => {
								winston.error(`Failed to delete filtered mention spam message from member '${msg.author.username}' in channel '${msg.channel.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
							});
						}

						// Get user data
						db.users.findOrCreate({_id: msg.author.id}, (err, userDocument) => {
							if(!err && userDocument) {
								// Handle this as a violation
								let violatorRoleID = null;
								if(!isNaN(serverDocument.config.moderation.filters.mention_filter.violator_role_id) && msg.member.roles.indexOf(serverDocument.config.moderation.filters.mention_filter.violator_role_id) ==-1){
									violatorRoleID = serverDocument.config.moderation.filters.mention_filter.violator_role_id;
								}
								bot.handleViolation(winston, msg.channel.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You put ${totalMentions} mentions in a message in #${msg.channel.name} on ${msg.channel.guild.name}`, `**@${bot.getName(msg.channel.guild, serverDocument, msg.member, true)}** mentioned ${totalMentions} members/roles in a message in #${msg.channel.name} on ${msg.channel.guild.name}`, `Mention spam (${totalMentions} members/roles) in #${msg.channel.name}`, serverDocument.config.moderation.filters.mention_filter.action, violatorRoleID);
							} else {
								winston.error("Failed to find or create user data for message mention filter violation", {usrid: msg.author.id}, err);
							}
						});
					}
				}

				// Only keep responding if the bot is on in the channel and author isn't blocked on the server
				if(channelDocument.bot_enabled && serverDocument.config.blocked.indexOf(msg.author.id)==-1) {
					// Translate message if necessary
					const translatedDocument = serverDocument.config.translated_messages.id(msg.author.id);
					if(translatedDocument) {
						// Detect the language (not always accurate; used only to exclude English messages from being translated to English)
						mstranslate.detect({text: msg.cleanContent}, (err, res) => {
							if(err) {
								winston.error(`Failed to auto-detect language for message '${msg.cleanContent}' from member '${msg.author.username}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, usrid: msg.author.id}, err);
							} else {
								// If the message is not in English, attempt to translate it from the language defined for the user
								if(res.toLowerCase() != 'en'){
									mstranslate.translate({text: msg.cleanContent, from: translatedDocument.source_language, to: "EN"}, (err, res) => {
										if(err) {
											winston.error(`Failed to translate message '${msg.cleanContent}' from member '${msg.author.username}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, usrid: msg.author.id}, err);
										} else {
											msg.channel.createMessage(`**@${bot.getName(msg.channel.guild, serverDocument, msg.member)}** said:\`\`\`${res}\`\`\``, {disable_everyone: true});
										}
									});
								}
							}
						});
					}

					// Vote by mention
					if(serverDocument.config.commands.points.isEnabled && msg.channel.guild.members.size>2 && !serverDocument.config.commands.points.disabled_channel_ids.includes(msg.channel.id) && msg.content.indexOf("<@")==0 && msg.content.indexOf(">")<msg.content.indexOf(" ") && msg.content.indexOf(" ")>-1 && msg.content.indexOf(" ")<msg.content.length-1) {
						const member = bot.memberSearch(msg.content.substring(0, msg.content.indexOf(" ")), msg.channel.guild);
						const voteStr = msg.content.substring(msg.content.indexOf(" "));
						if(member && [bot.user.id, msg.author.id].indexOf(member.id)==-1 && !member.user.bot) {
							// Get target user data
							db.users.findOrCreate({_id: member.id}, (err, targetUserDocument) => {
								if(!err && targetUserDocument) {
									let voteAction;

									// Check for +1 triggers
									for(let i=0; i<config.vote_triggers.length; i++) {
										if(voteStr.indexOf(config.vote_triggers[i])==0) {
											voteAction = "upvoted";

											// Increment points
											targetUserDocument.points++;
											break;
										}
									}

									// Check for gild triggers
									if(voteStr.indexOf(" gild")==0 || voteStr.indexOf(" guild")==0) {
										voteAction = "gilded";
									}

									// Log and save changes if necessary
									if(voteAction) {
										const saveTargetUserDocumentPoints = () => {
											targetUserDocument.save(err => {
												if(err) {
													winston.error("Failed to save user data for points", {usrid: member.id}, err);
												}
											});
											winston.info(`User '${member.user.username}' ${voteAction} by user '${msg.author.username} on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
										};

										if(voteAction=="gilded") {
											// Get user data
											db.users.findOrCreate({_id: msg.author.id}, (err, userDocument) => {
												if(!err && userDocument) {
													if(userDocument.points>10) {
														userDocument.points -= 10;
														userDocument.save(err => {
															if(err) {
																winston.error("Failed to save user data for points", {usrid: msg.author.id}, err);
															}

															targetUserDocument.points += 10;
															saveTargetUserDocumentPoints();
														});
													} else {
														winston.warn(`User '${msg.author.username}' does not have enough points to gild '${member.user.username}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
														msg.channel.createMessage(`${msg.author.mention} You don't have enough AwesomePoints to gild ${member}`);
													}
												}
											});
										} else {
											saveTargetUserDocumentPoints();
										}
									}
								}
							});
						}
					}

					// Vote based on previous message
					for(let i=0; i<config.vote_triggers.length; i++) {
						if((` ${msg.content}`).indexOf(config.vote_triggers[i])==0) {
							// Get previous message
							bot.getMessages(msg.channel.id, 1, msg.id).then(messages => {
								if(messages[0] && [bot.user.id, msg.author.id].indexOf(messages[0].author.id)==-1 && !messages[0].author.bot) {
									// Get target user data
									db.users.findOrCreate({_id: messages[0].author.id}, (err, targetUserDocument) => {
										if(!err && targetUserDocument) {
											winston.info(`User '${messages[0].author.username}' upvoted by user '${msg.author.username} on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});

											// Increment points
											targetUserDocument.points++;

											// Save changes to targetUserDocument
											targetUserDocument.save(err => {
												if(err) {
													winston.error("Failed to save user data for points", {usrid: msg.author.id}, err);
												}
											});
										}
									});
								}
							}).catch();
							break;
						}
					}

					// Check if message mentions AFK user (server and global)
					if(msg.mentions.length) {
						msg.mentions.forEach(usr => {
							const member = msg.channel.guild.members.get(usr.id);
							if([bot.user.id, msg.author.id].indexOf(usr.id)==-1 && !usr.bot) {
								// Server AFK message
								const targetMemberDocument = serverDocument.members.id(usr.id);
								if(targetMemberDocument && targetMemberDocument.afk_message) {
									msg.channel.createMessage({
										content: `**@${bot.getName(msg.channel.guild, serverDocument, member)}** is currently AFK: ${targetMemberDocument.afk_message}`,
										disableEveryone: true
									});
								// Global AFK message
								} else {
									db.users.findOne({_id: usr.id}, (err, targetUserDocument) => {
										if(!err && targetUserDocument && targetUserDocument.afk_message) {
											msg.channel.createMessage({
												content: `**@${bot.getName(msg.channel.guild, serverDocument, member)}** is currently AFK: ${targetUserDocument.afk_message}`,
												disableEveryone: true
											});
										}
									});
								}
							}
						});
					}

					// Delete command message if necessary
					const deleteCommandMessage = (serverDocument, channelDocument, msg) => {
						if(serverDocument.config.delete_command_messages && msg.channel.permissionsOf(msg._client.user.id).has("manageMessages")) {
							channelDocument.isMessageDeletedDisabled = true;
							msg.delete().then(() => {
								channelDocument.isMessageDeletedDisabled = false;
								serverDocument.save(() => {});
							});
						}
					};

					// Set the command cooldown in a channel
					const setCooldown = (winston, serverDocument, channelDocument) => {
						if(serverDocument.config.command_cooldown>0 || channelDocument.command_cooldown>0) {
							channelDocument.isCommandCooldownOngoing = true;

							// End cooldown after interval (favor channel config over server)
							setTimeout(() => {
								channelDocument.isCommandCooldownOngoing = false;
								serverDocument.save(err => {
									if(err) {
										winston.error("Failed to save server data for command cooldown", {svrid: serverDocument._id}. err);
									}
								});
							}, channelDocument.command_cooldown || serverDocument.config.command_cooldown);
						}
					};

					// Increment command usage count
					const incrementCommandUsage = (serverDocument, command) => {
						if(!serverDocument.command_usage) {
							serverDocument.command_usage = {};
						}
						if(serverDocument.command_usage[command]==null) {
							serverDocument.command_usage[command] = 0;
						}
						serverDocument.command_usage[command]++;
						serverDocument.markModified("command_usage");
					};

					// Save changes to serverDocument (recursive)
					const saveServerDocument = () => {
						serverDocument.save(err => {
							if(err) {
								winston.error("Failed to save server data for message", {svrid: msg.channel.guild.id}, err);
							}
						});
					};

					// Only keep responding if there isn't an ongoing command cooldown in the channel
					if(!channelDocument.isCommandCooldownOngoing || memberBotAdmin>0) {
						// Check if message is a command, tag command, or extension trigger
						const command = bot.checkCommandTag(msg.content, serverDocument);
						// Check if it's a first-party command and if it's allowed to run here
						if(command && bot.getPublicCommandMetadata(command.command) && serverDocument.config.commands[command.command].isEnabled && (bot.getPublicCommandMetadata(command.command).admin_exempt || memberBotAdmin>=serverDocument.config.commands[command.command].admin_level) && serverDocument.config.commands[command.command].disabled_channel_ids.indexOf(msg.channel.id)==-1) {
							// Increment command usage count
							incrementCommandUsage(serverDocument, command.command);

							// Get user data
							db.users.findOrCreate({_id: msg.author.id}, (err, userDocument) => {
								if(!err && userDocument) {
									// NSFW filter for command suffix
									if(memberBotAdmin<1 && bot.getPublicCommandMetadata(command.command).defaults.is_nsfw_filtered && checkFiltered(serverDocument, msg.channel, command.suffix, true, false)) {
										// Delete offending message if necessary
										if(serverDocument.config.moderation.filters.nsfw_filter.delete_message) {
											msg.delete().then().catch(err => {
												winston.error(`Failed to delete NSFW command message from member '${msg.author.username}' in channel '${msg.channel.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
											});
										}

										// Handle this as a violation
										let violatorRoleID = null;
										if(!isNaN(serverDocument.config.moderation.filters.nsfw_filter.violator_role_id) && msg.member.roles.indexOf(serverDocument.config.moderation.filters.nsfw_filter.violator_role_id) ==-1){
											violatorRoleID = serverDocument.config.moderation.filters.nsfw_filter.violator_role_id;
										}
										bot.handleViolation(winston, msg.channel.guild, serverDocument, msg.channel, msg.member, userDocument, memberDocument, `You tried to fetch NSFW content in #${msg.channel.name} on ${msg.channel.guild.name}`, `**@${bot.getName(msg.channel.guild, serverDocument, msg.member, true)}** is trying to fetch NSFW content (\`${msg.cleanContent}\`) in #${msg.channel.name} on ${msg.channel.guild.name}`, `NSFW filter violation ("${msg.cleanContent}") in #${msg.channel.name}`, serverDocument.config.moderation.filters.nsfw_filter.action, violatorRoleID);
									// Run the command
									} else {
										winston.info(`Treating '${msg.cleanContent}' as a command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});

										deleteCommandMessage(serverDocument, channelDocument, msg);

										try {
											bot.getPublicCommand(command.command)(bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, command.suffix, {
												name: command.command,
												usage: bot.getPublicCommandMetadata(command.command).usage,
												description: bot.getPublicCommandMetadata(command.command).description
											});
										} catch(err) {
											winston.error(`Failed to process command '${command.command}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
											msg.channel.createMessage("Something went wrong 😱");
										}
										setCooldown(winston, serverDocument, channelDocument);
									}
									saveServerDocument();
								} else {
									winston.error("Failed to find or create user data for message", {usrid: msg.author.id}, err);
								}
							});
						// Check if it's a trigger for a tag command
						} else if(command && serverDocument.config.tags.list.id(command.command) && serverDocument.config.tags.list.id(command.command).isCommand) {
							winston.info(`Treating '${msg.cleanContent}' as a tag command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
							msg.channel.createMessage({
								content: serverDocument.config.tags.list.id(command.command).content,
								disableEveryone: true
							});
							setCooldown(winston, serverDocument, channelDocument);
							saveServerDocument();
						} else {
							// Check if it's a command or keyword extension trigger
							let extensionApplied = false;
							for(let i=0; i<serverDocument.extensions.length; i++) {
								if(memberBotAdmin>=serverDocument.extensions[i].admin_level && serverDocument.extensions[i].enabled_channel_ids.indexOf(msg.channel.id)>-1) {
									// Command extensions
									if(serverDocument.extensions[i].type=="command" && command && command.command==serverDocument.extensions[i].key) {
										winston.info(`Treating '${msg.cleanContent}' as a trigger for command extension '${serverDocument.extensions[i].name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
										extensionApplied = true;

										// Do the normal things for commands
										incrementCommandUsage(serverDocument, command.command);
										deleteCommandMessage(serverDocument, channelDocument, msg);
										setCooldown(winston, serverDocument, channelDocument);

										runExtension(bot, db, winston, msg.channel.guild, serverDocument, msg.channel, serverDocument.extensions[i], msg, command.suffix, null);
									// Keyword extensions
									} else if(serverDocument.extensions[i].type=="keyword") {
										const keywordMatch = msg.content.containsArray(serverDocument.extensions[i].keywords, serverDocument.extensions[i].case_sensitive);
										if(((serverDocument.extensions[i].keywords.length>1 || serverDocument.extensions[i].keywords[0]!="*") && keywordMatch.selectedKeyword>-1) || (serverDocument.extensions[i].keywords.length==1 && serverDocument.extensions[i].keywords[0]=="*")) {
											winston.info(`Treating '${msg.cleanContent}' as a trigger for keyword extension '${serverDocument.extensions[i].name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
											runExtension(bot, db, winston, msg.channel.guild, serverDocument, msg.channel, serverDocument.extensions[i], msg, null, keywordMatch);
										}
									}
								}
							}
							if(extensionApplied) {
								saveServerDocument();
							}

							// Check if it's a chatterbot prompt
							if(!extensionApplied && serverDocument.config.chatterbot && msg.content.indexOf(bot.user.mention)==0 || msg.content.indexOf(`<@!${bot.user.id}>`)==0 && msg.content.indexOf(" ")>-1 && msg.content.length>msg.content.indexOf(" ")) {
								const prompt = msg.cleanContent.substring((msg.channel.guild.members.get(bot.user.id).nick || bot.user.username).length+2).trim();
								setCooldown(winston, serverDocument, channelDocument);
								saveServerDocument();

								// Default help response
								if(prompt.toLowerCase().indexOf("help")==0) {
									msg.channel.createMessage(`Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}help\` for info about how to use me on this server :smiley:`);
								// Process chatterbot prompt
								} else {
									winston.info(`Treating '${msg.cleanContent}' as a chatterbot prompt`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
									chatterbotPrompt(msg.author.id, prompt, msg.channel.guild.members.get(bot.user.id).nick || bot.user.username, res => {
										msg.channel.createMessage({
											content: `${msg.author.mention} ${res}`,
											disableEveryone: true
										});
									});
								}
							// Finally, show a tag reaction if necessary
							} else if(!extensionApplied && msg.mentions.find(usr => {
								return usr.id==bot.user.id;
							}) && serverDocument.config.tag_reaction.isEnabled) {
								msg.channel.createMessage(serverDocument.config.tag_reaction.messages.random().replaceAll("@user", `**@${bot.getName(msg.channel.guild, serverDocument, msg.member)}**`).replaceAll("@mention", msg.author.mention));
							}
						}
					} else {
						saveServerDocument();
					}
				}
			} else {
				winston.error("Failed to find server data for message", {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
			}
		});
	}
};

// Check if string contains at least one element in array
String.prototype.containsArray = (arr, isCaseSensitive) => {
	let selectedKeyword = -1;
	let keywordIndex = -1;
	for(let i=0; i<arr.length; i++) {
		if(isCaseSensitive && this.contains(arr[i])) {
			selectedKeyword = i;
			keywordIndex = this.indexOf(arr[i]);
			break;
		} else if(!isCaseSensitive && this.toLowerCase().contains(arr[i].toLowerCase())) {
			selectedKeyword = i;
			keywordIndex = this.toLowerCase().indexOf(arr[i].toLowerCase());
			break;
		}
	}
	return {
		selectedKeyword,
		keywordIndex
	};
};
