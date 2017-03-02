module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		let num, query;
		if(suffix.indexOf(" ") > -1) {
			num = suffix.substring(0, suffix.indexOf(" ")).trim();
			query = suffix.substring(suffix.indexOf(" ") + 1).trim();
		} else {
			num = suffix;
		}
		if(!num || isNaN(num) || (num != -1 && num < 2)) {
			winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0xFF0000,
					description: `I need a valid 🔢 of messages to delete`
				}
			});
		} else {
			num = parseInt(num);
			let filter = () => {
				return true;
			};
			let before, after;
			if(query) {
				query = query.trim();
				if(query.startsWith(":") && query.length > 1) {
					filter = message => {
						return message.content.toLowerCase().indexOf(query.slice(1).toLowerCase());
					};
				} else if(query.startsWith(">") && query.length > 1 && !isNaN(query.slice(1))) {
					after = query.slice(1);
				} else if(query.startsWith("<") && query.length > 1 && !isNaN(query.slice(1))) {
					before = query.slice(1);
				} else {
					let member;
					if(query.startsWith("<@") && query.indexOf(">") > -1) {
						member = bot.memberSearch(query, msg.channel.guild);
					}
					if(member) {
						filter = message => {
							return message.author.id==member.id;
						};
					} else {
						filter = message => {
							return message.content.toLowerCase()==query.toLowerCase();
						};
					}
				}
			}

			msg.channel.purge(num, filter, before, after).then(deleted => {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						description: `🗑🔥 Deleted ${deleted} message${deleted == 1 ? "" : "s"} in this channel`
					}
				});
			}).catch(err => {
				winston.error(`Failed to ${commandData.name} in channel '${msg.channel.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						description: "Uh oh, I couldn't delete all those messages. Try a smaller number...or maybe I just don't have permissions to nuke this channel 💣"
					}
				});
			});
		}
	} else {
		winston.warn(`Parameters not provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0xFF0000,
				description: `Hmmm? \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}\``
			}
		});
	}
};
