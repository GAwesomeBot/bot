const ModLog = require("./../../Modules/ModerationLogging.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix) {
		let member, reason;
		if(suffix.indexOf("|" )> -1 && suffix.length > 3) {
			member = bot.memberSearch(suffix.substring(0, suffix.indexOf("|")).trim(), msg.channel.guild);
			reason = suffix.substring(suffix.indexOf("|") + 1).trim();
		} else {
			member = bot.memberSearch(suffix, msg.channel.guild);
		}
		if(member) {
			member.ban(1).then(() => {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						title: `Bye-bye **@${bot.getName(msg.channel.guild, serverDocument, member)}** 🔨`,
						image: {
							url: "http://media-kingdgrizzle.tk/2017/01/62ac6016dc438a1fe4926ed43d3fe280.gif"
						}
					}
				});
				ModLog.create(msg.channel.guild, serverDocument, "Ban", member, msg.member, reason);
			}).catch(err => {
				winston.error(`Failed to ban member '${member.user.username}' from server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.name, usrid: member.id}, err);
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						description: `I couldn't ban **@${bot.getName(msg.channel.guild, serverDocument, member)}** 🍇`
					}
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
					description: "I couldn't find a matching member on this server."
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
				description: "Do you want me to ban you? 😮"
			}
		});
	}
};
