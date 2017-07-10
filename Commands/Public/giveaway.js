module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(channelDocument.giveaway.isOngoing) {
		if(suffix) {
			if(suffix.toLowerCase() == "enroll" || suffix.toLowerCase() == "join") {
				if(channelDocument.giveaway.creator_id == msg.author.id) {
					msg.channel.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0x9ECDF2,
							description: `${msg.author.mention} Uh, you can't join your own giveaway. That would kinda defeat the purpose, wouldn't it? 😛`
						}
					});
				} else {
					if(channelDocument.giveaway.participant_ids.indexOf(msg.author.id) > -1) {
						msg.channel.createMessage({
							embed: {
                                author: {
                                    name: bot.user.username,
                                    icon_url: bot.user.avatarURL,
                                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                },
                                color: 0x9ECDF2,
								description: `You're already joined in the giveaway **${channelDocument.giveaway.title}** in this channel. Would you like to leave the giveaway?`
							}
						}).then(() => {
							bot.awaitMessage(msg.channel.id, msg.author.id, message => {
								if(config.yes_strings.includes(message.content.toLowerCase().trim())) {
									channelDocument.giveaway.participant_ids.splice(channelDocument.giveaway.participant_ids.indexOf(msg.author.id), 1);
									msg.channel.createMessage({
										embed: {
                                            author: {
                                                name: bot.user.username,
                                                icon_url: bot.user.avatarURL,
                                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                            },
                                            color: 0x00FF00,
											description: `Ok, ${msg.author.mention} now has 0 chance of winning 🐿`
										}
									});
								}
							});
						});
					} else {
						channelDocument.giveaway.participant_ids.push(msg.author.id);
						msg.channel.createMessage({
							embed: {
                                author: {
                                    name: bot.user.username,
                                    icon_url: bot.user.avatarURL,
                                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                },
                                color: 0x00FF00,
								description: `Alright ${msg.author.mention}! Here's a dolphin to wish you good luck: 🐬`
							}
						});
					}
				}
			} else {
				winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						description: `${msg.author.mention} huh? This command only takes \`enroll\` or \`join\` as a parameter`
					}
				});
			}
		} else {
			const creator = msg.channel.guild.members.get(channelDocument.giveaway.creator_id);
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x9ECDF2,
					description: `**${channelDocument.giveaway.title}** 🍰\nStarted by @${creator ? bot.getName(msg.channel.guild, serverDocument, creator) : "invalid-user"}\t${channelDocument.giveaway.participant_ids.length} ${channelDocument.giveaway.participant_ids.length==1 ? "person" : "people"} joined currently`
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
                color: 0x9ECDF2,
				description: `There's isn't a giveaway going on in this channel. 👻 PM me \`${commandData.name} ${msg.channel.guild.name}|#${msg.channel.name}\` to start one.`
			}
		});
	}
};