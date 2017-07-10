module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		if(suffix.indexOf("|") > -1) {
			if(msg.member.permission.has("manageNicknames")) {
				const args = suffix.split("|");
				if(args.length == 2 && args[0].trim()) {
					const member = bot.memberSearch(args[0].trim(), msg.channel.guild);
					if(member) {
						if(args[1].trim() == ".") {
							args[1] = "";
						}
						bot.editGuildMember(msg.channel.guild.id, member.id, {nick: args[1].trim()}).then(() => {
							msg.channel.createMessage({
								embed: {
                                    author: {
                                        name: bot.user.username,
                                        icon_url: bot.user.avatarURL,
                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                    },
                                    color: 0x00FF00,
									description: `**@${bot.getName(msg.channel.guild, serverDocument, member, true)}** now has the nickname \`${member.nick}\``
								}
							});
						}).catch(err => {
							msg.channel.createMessage({
								embed: {
                                    author: {
                                        name: bot.user.username,
                                        icon_url: bot.user.avatarURL,
                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                    },
                                    color: 0xFF0000,
									description: "I guess Discord hates me or something 😰"
								}
							});
							winston.error(`Failed to change nickname for member '${member.user.username}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
						});
					} else {
						winston.warn(`Requested member does not exist so ${commandData.name} cannot be changed`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
						msg.channel.createMessage({
							embed: {
                                author: {
                                    name: bot.user.username,
                                    icon_url: bot.user.avatarURL,
                                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                },
                                color: 0xFF0000,
								description: `I don't know who ${args[0].trim()} is! 😦`
							}
						});
					}
				} else {
					winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
					msg.channel.createMessage({
						embed: {
							description: `Huh? Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <user>|<name>\` to change someone's nickname`
						}
					});
				}
			} else {
				winston.warn(`Member '${msg.author.username}' does not have permission to manage nicknames on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage({
					embed: {
						description: `You don't have permission to edit other people's nicks on this server 🔨`
					}
				});
			}
		} else {
			if(suffix == ".") {
				suffix = "";
			}
			bot.editGuildMember(msg.channel.guild.id, msg.author.id, {nick: suffix}).then(() => {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						description: `You now have the nickname \`${msg.member.nick}\` on this server 💥`
					}
				});
			}).catch(err => {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						description: "I guess Discord hates me or something 😰"
					}
				});
				winston.error(`Failed to change nickname for member '${msg.author.username}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
			});
		}
	} else {
		if(msg.member.nick) {
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
					description: `🏷 Your nick on this server is \`${msg.member.nick}\``
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
					description: `You don't have a nick on this server. Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <name>\` to set one`
				}
			});
		}
	}
};
