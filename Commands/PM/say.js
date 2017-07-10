module.exports = (bot, db, config, winston, userDocument, msg, suffix, commandData) => {
	if(suffix && suffix.indexOf("|")>-1) {
		const svrname = suffix.substring(0, suffix.indexOf("|")).trim();
		const chname = suffix.substring(suffix.indexOf("|") + 1).trim();
		if(svrname && chname) {
			const svr = bot.serverSearch(svrname, msg.author, userDocument);
			if(svr) {
				const member = svr.members.get(msg.author.id);
				if(member) {
					db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
						if(!err && serverDocument) {
							if(bot.getUserBotAdmin(svr, serverDocument, member) > 0) {
								const ch = bot.channelSearch(chname, svr);
								if(ch) {
									if(ch.type == 0) {
										msg.channel.createMessage({
											embed: {
												author: {
                                                    name: bot.user.username,
                                                    icon_url: bot.user.avatarURL,
                                                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
												},
												color: 0x9ECDF2,
												description: `What do you want me to say in #${ch.name} on ${svr.name}?`
											}
										}).then(() => {
											bot.awaitMessage(msg.channel.id, msg.author.id, message => {
												ch.createMessage(message.content).then(() => {
													msg.channel.createMessage({
														embed: {
                                                            author: {
                                                                name: bot.user.username,
                                                                icon_url: bot.user.avatarURL,
                                                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                            },
															color: 0x00FF00,
															description: `Cool, check #${ch.name} 📢`
														}
													});
												}).catch(() => {
													msg.channel.createMessage({
														embed: {
                                                            author: {
                                                                name: bot.user.username,
                                                                icon_url: bot.user.avatarURL,
                                                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                                            },
															color: 0xFF0000,
															description: "Oops, something went wrong. 🐽 Try resending..."
														}
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
												title: "Warning",
												description: "I can only say things in text channels 🎤"
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
										description: `🔐 You don't have permission to use this command on ${svr.name}`
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
                            description: "You're not on that server lol 🈲"
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
						description: "That server doesn't exist or I'm not on it❗ 😱"
					}
				});
			}
			return;
		}
	}
	winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {usrid: msg.author.id});
	msg.channel.createMessage({
        author: {
            name: bot.user.username,
            icon_url: bot.user.avatarURL,
            url: "https://github.com/GilbertGobbels/GAwesomeBot"
        },
        color: 0xFF0000,
		title: "Warning! Incorrect usage!",
		description: `🗯 \`${commandData.name} ${commandData.usage}\``
	});
};
