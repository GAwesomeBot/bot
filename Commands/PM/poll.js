const Polls = require("./../../Modules/Polls.js");

module.exports = (bot, db, config, winston, userDocument, msg, suffix, commandData) => {
	if(suffix && suffix.indexOf("|") > -1) {
		const svrname = suffix.substring(0, suffix.indexOf("|")).trim();
		const chname = suffix.substring(suffix.indexOf("|") + 1).trim();
		if(svrname && chname) {
			const svr = bot.serverSearch(svrname, msg.author, userDocument);
			if(svr) {
				const member = svr.members.get(msg.author.id);
				if(member) {
					db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
						if(!err && serverDocument) {
							if(serverDocument.config.blocked.indexOf(msg.author.id) > -1) {
								return;
							}
							const ch = bot.channelSearch(chname, svr);
							if(ch) {
								if(ch.type == 0) {
									let channelDocument = serverDocument.channels.id(ch.id);
									if(!channelDocument) {
										serverDocument.channels.push({_id: ch.id});
										channelDocument = serverDocument.channels.id(ch.id);
									}
									if(channelDocument.poll.isOngoing) {
										if(channelDocument.poll.creator_id == msg.author.id) {
											msg.channel.createMessage({
												embed: {
                                                    author: {
                                                        name: bot.user.username,
                                                        icon_url: bot.user.avatarURL,
                                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                    },
													color: 0x9ECDF2,
													description: `You've already started a poll (called \`${channelDocument.poll.title}\`) in #${ch.name}. Would you like to end it now and show the results?`
												}
											}).then(() => {
												bot.awaitMessage(msg.channel.id, msg.author.id, message => {
													if(config.yes_strings.indexOf(message.content.toLowerCase().trim()) > -1) {
														Polls.end(serverDocument, ch, channelDocument);
														msg.channel.createMessage({
															embed: {
                                                                author: {
                                                                    name: bot.user.username,
                                                                    icon_url: bot.user.avatarURL,
                                                                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                                },
																color: 0x00FF00,
																description: `Alright, poll ended. See #${ch.name} for the results! 🍿`
															}
														});
													}
												});
											});
										} else {
											const voteDocument = channelDocument.poll.responses.id(msg.author.id);
											if(voteDocument) {
												msg.channel.createMessage({
													embed: {
                                                        author: {
                                                            name: bot.user.username,
                                                            icon_url: bot.user.avatarURL,
                                                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                        },
														color: 0xFF0000,
														description: `You've already voted on the poll in #${ch.name}. Would you like to erase your vote?`
													}
												}).then(() => {
													bot.awaitMessage(msg.channel.id, msg.author.id, message => {
														if(config.yes_strings.indexOf(message.content.toLowerCase().trim())>-1) {
															voteDocument.remove();
															serverDocument.save(err => {
																if(err) {
																	winston.warn("Failed to save server data for poll", {svrid: svr.id, chid: ch.id}, err);
																}
																msg.channel.createMessage({
																	embed: {
                                                                        author: {
                                                                            name: bot.user.username,
                                                                            icon_url: bot.user.avatarURL,
                                                                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                                        },
                                                                        color: 0x00FF00,
																		description: `Alright, I removed your vote. 🔪 Use \`${msg.content}\` to vote again, anonymously.`
																	}
																});
															});
														}
													});
												});
											} else {
												let embed_fields = [];
												channelDocument.poll.options.map((option, i) => {
													embed_fields.push({
														name: `${i}`,
														value: `${option}`,
														inline: true
													});
												});
												msg.channel.createMessage({
                                                    embed: {
                                                        author: {
                                                            name: bot.user.username,
                                                            icon_url: bot.user.avatarURL,
                                                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                        },
                                                        color: 0x9ECDF2,
                                                        description: `There's a poll in #${ch.name} called **${channelDocument.poll.title}**. ⚔ To vote anonymously, select one of the following options:`,
                                                        fields: embed_fields
													}
												}).then(() => {
													bot.awaitMessage(msg.channel.id, msg.author.id, message => {
														message.content = message.content.trim();
														return message.content && !isNaN(message.content) && message.content >= 0 && message.content < channelDocument.poll.options.length;
													}, message => {
														const vote = parseInt(message.content.trim());
														channelDocument.poll.responses.push({
															_id: msg.author.id,
															vote
														});
														serverDocument.save(err => {
															if(err) {
																winston.warn("Failed to save server data for poll", {svrid: svr.id, chid: ch.id}, err);
															}
															msg.channel.createMessage({
																embed: {
                                                                    author: {
                                                                        name: bot.user.username,
                                                                        icon_url: bot.user.avatarURL,
                                                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                                    },
                                                                    color: 0x00FF00,
																	description: `🎈 I casted your vote for \`${channelDocument.poll.options[vote]}\``
																}
															});
														});
													});
												});
											}
										}
									} else {
										if(bot.getUserBotAdmin(svr, serverDocument, member)>serverDocument.config.commands[commandData.name].admin_level) {
											msg.channel.createMessage({
												embed: {
                                                    author: {
                                                        name: bot.user.username,
                                                        icon_url: bot.user.avatarURL,
                                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                    },
                                                    color: 0x9ECDF2,
													description: "❓ Enter a title or question for the poll:"
												}
											}).then(() => {
												bot.awaitMessage(msg.channel.id, msg.author.id, message => {
													const title = message.content.trim();
													msg.channel.createMessage({
														embed: {
                                                            author: {
                                                                name: bot.user.username,
                                                                icon_url: bot.user.avatarURL,
                                                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                            },
                                                            color: 0x9ECDF2,
															description: "✍ Enter options for poll (comma-separated), or `.` to use the default yes/no options:"
														}
													}).then(() => {
														bot.awaitMessage(msg.channel.id, msg.author.id, message => {
															const options = message.content.trim() == "." ? ["No", "Yes"] : message.content.split(",");
															Polls.start(bot, svr, serverDocument, msg.author, ch, channelDocument, title, options);
                                                            let embed_fields = [];
                                                            options.map((option, i) => {
                                                                embed_fields.push({
                                                                    name: `${i}`,
                                                                    value: `${option}`,
                                                                    inline: true
                                                                });
                                                            });
															msg.channel.createMessage({
																embed: {
                                                                    author: {
                                                                        name: bot.user.username,
                                                                        icon_url: bot.user.avatarURL,
                                                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                                    },
                                                                    color: 0x00FF00,
																	description: `🍻 Poll started with question / title of ${title} and the options:`,
																	fields: embed_fields
																}
															});
														});
													});
												});
											});
										} else {
											msg.channel.createMessage({
												embed: {
                                                    author: {
                                                        name: bot.user.username,
                                                        icon_url: bot.user.avatarURL,
                                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                    },
                                                    color: 0xFF0000,
													description: `🔐 You don't have permission to use this command on ${svr.name}`
												}
											});
										}
									}
								} else {
									msg.channel.createMessage({
										embed: {
                                            author: {
                                                name: bot.user.username,
                                                icon_url: bot.user.avatarURL,
                                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                            },
                                            color: 0xFF0000,
											description: "I can only do polls in text channels 🎤"
										}
									});
								}
							} else {
								msg.channel.createMessage({
									embed: {
                                        author: {
                                            name: bot.user.username,
                                            icon_url: bot.user.avatarURL,
                                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                        },
                                        color: 0xFF0000,
										title: "Error",
										description: `There's no channel called ${chname} on ${svr.name} AFAIK ⚠`
									}
								});
							}
						} else {
							msg.channel.createMessage({
								embed: {
                                    author: {
                                        name: bot.user.username,
                                        icon_url: bot.user.avatarURL,
                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                    },
                                    color: 0xFF0000,
									description: "Uh idk something went wrong. Blame Mongo. *always blame mongo*"
								}
							});
						}
					});
				} else {
					msg.channel.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0xFF0000,
							description: "🈲 You're not on that server lol"
						}
					});
				}
			} else {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						title: "Error",
						description: "That server doesn't exist or I'm not on it❗"
					}
				});
			}
			return;
		}
	}
	winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {usrid: msg.author.id});
	msg.channel.createMessage({
		embed: {
            author: {
                name: bot.user.username,
                icon_url: bot.user.avatarURL,
                url: "https://github.com/GilbertGobbels/GAwesomeBot"
            },
            color: 0x9ECDF2,
			description: `🗯 Correct usage is: \`${commandData.name} ${commandData.usage}\``
		}
	});
};
