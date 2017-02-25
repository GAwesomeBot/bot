module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		const createCount = name => {
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x9ECDF2,
					description: `I can't find a count called \`${name}\`. Would you like to create it?`
				}
			}).then(() => {
				bot.awaitMessage(msg.channel.id, msg.author.id, message => {
					if(config.yes_strings.includes(message.content.toLowerCase().trim())) {
						serverDocument.config.count_data.push({_id: name});
						serverDocument.save(err => {
							if(err) {
								winston.error("Failed to save server data for creating count", {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
							}
							msg.channel.createMessage({
								embed: {
                                    author: {
                                        name: bot.user.username,
                                        icon_url: bot.user.avatarURL,
                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                    },
                                    color: 0x00FF00,
									description: `Initialized count **${name}** with value \`0\`. Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${name}|+1\` to increment it.`
								}
							});
						});
					}
				});
			});
		};
		if(suffix.indexOf("|") > -1) {
			const args = suffix.split("|");
			if(args.length == 2 && args[0].trim() && (!args[1].trim() || [".", "+1", "-1"].includes(args[1].trim()))) {
				const countDocument = serverDocument.config.count_data.id(args[0].toLowerCase().trim());
				if(countDocument) {
					switch(args[1].trim()) {
						case "":
						case ".":
							countDocument.remove();
							msg.channel.createMessage({
								embed: {
                                    author: {
                                        name: bot.user.username,
                                        icon_url: bot.user.avatarURL,
                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                    },
                                    color: 0x00FF00,
									description: `*Poof!* 💨 ${countDocument._id} is gone`
								}
							});
							return;
						case "+1":
							countDocument.value++;
							break;
						case "-1":
							if(countDocument.value > 0) {
								countDocument.value--;
								break;
							} else {
								msg.channel.createMessage({
									embed: {
                                        author: {
                                            name: bot.user.username,
                                            icon_url: bot.user.avatarURL,
                                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                        },
                                        color: 0xFF0000,
										description: "I can't subtract 1 from 0. My creators forgot to teach me about negative numbers 😰"
									}
								});
								return;
							}
					}
					msg.channel.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0x9ECDF2,
							description: `\`${countDocument._id}\` is now at **${countDocument.value}** 🧀`
						}
					});
				} else {
					createCount(args[0].toLowerCase().trim());
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
						description: `me = confused 🕵`
					}
				});
			}
		} else {
			const countDocument = serverDocument.config.count_data.id(suffix.toLowerCase());
			if(countDocument) {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						title: `💯 **${countDocument._id}:**`,
						description: `${countDocument.value}`
					}
				});
			} else {
				createCount(suffix.toLowerCase());
			}
		}
	} else {
		const info = serverDocument.config.count_data.map(countDocument => {
			return `${countDocument._id}: ${countDocument.value}`;
		}).sort();
		let embed_fields = [];
		serverDocument.config.count_data.map(countDocument => {
			embed_fields.push({
				name: `${countDocument._id}:`,
				value: `${countDocument.value}`,
				inline: true
			});
		}).sort();
		if(info.length > 0) {
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
					description: `**${info.length} count${info.length==1 ? "" : "s"} on this server: 🔢**`,
					fields: embed_fields
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
                    color: 0x9ECDF2,
					description: `No one on this server is counting anything. Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <name>\` to start tallying something. 🐶`
				}
			});
		}
	}
};
