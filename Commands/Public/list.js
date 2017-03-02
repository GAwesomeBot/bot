module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const showList = () => {
		let embed_fields = [];
		serverDocument.config.list_data.map((listDocument, i) => {
			embed_fields.push({
				name: `${listDocument.isCompleted ? "✅" : "📝"} **${++i}:**`,
				value: `${listDocument.content}`,
				inlibe: true
			});
		});
		if(embed_fields.length > 0) {
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
					description: "Here are the current to-do lists for this server",
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
                    color: 0xFF0000,
					description: `❎ No to-do list items! Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <content>\` to add one.`
				}
			});
		}
	};
	if(suffix) {
		if(suffix.indexOf("|") > -1) {
			const args = suffix.split("|");
			if(args[0].trim() && !isNaN(args[0].trim())) {
				const i = parseInt(args[0].trim()) - 1;
				const action = args[1].trim();
				if(i >= 0 && i < serverDocument.config.list_data.length) {
					let id = i;
					switch(action) {
						case "":
						case ".":
							serverDocument.config.list_data.splice(i, 1);
							msg.channel.createMessage({
								embed: {
                                    author: {
                                        name: bot.user.username,
                                        icon_url: bot.user.avatarURL,
                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                    },
                                    color: 0x00FF00,
									description: `Removed item ${++id} from list. ❌`
								}
							}).then(showList);
							return;
						case "done":
						case "complete":
							serverDocument.config.list_data[i].isCompleted = !serverDocument.config.list_data[i].isCompleted;
							msg.channel.createMessage({
								embed: {
                                    author: {
                                        name: bot.user.username,
                                        icon_url: bot.user.avatarURL,
                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                    },
                                    color: 0x00FF00,
									description: `Marked ${++id} as done!`
								}
							}).then(showList);
							return;
						default:
							serverDocument.config.list_data[i].content = action;
							break;
					}
					msg.channel.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0x00FF00,
							description: "Gotcha 👑"
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
							description: `That number needs to be between 1 and ${serverDocument.config.list_data.length} inclusive`
						}
					});
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
						description: `I...didn't get that`
					}
				});
			}
		} else {
			serverDocument.config.list_data.push({content: suffix});
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
					description: `Added item \`${serverDocument.config.list_data.length}\` (named ${serverDocument.config.list_data[serverDocument.config.list_data.length - 1].content}) to the server to-do list 🚀`
				}
			}).then(showList);
		}
	} else {
		showList();
	}
};