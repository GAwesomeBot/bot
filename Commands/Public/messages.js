module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix == "me") {
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x00FF00,
				description: `💬 You've sent ${memberDocument.messages} message${memberDocument.messages == 1 ? "" : "s"} this week`
			}
		});
	} else if(suffix) {
		const member = bot.memberSearch(suffix, msg.channel.guild);
		if(member) {
			if(member.user.bot) {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						description: "I don't keep tabs on my brethren 🤖😈"
					}
				});
			} else {
				let targetMemberDocument = serverDocument.members.id(member.id);
				if(!targetMemberDocument) {
					serverDocument.members.push({_id: member.id});
					targetMemberDocument = serverDocument.members.id(member.id);
				}
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						description: `💬 **@${bot.getName(msg.channel.guild, serverDocument, member)}** has sent ${targetMemberDocument.messages} message${targetMemberDocument.messages == 1 ? "" : "s"} this week`
					}
				});
			}
		} else {
			winston.warn(`Requested member does not exist so ${commandData.name} cannot be shown`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0xFF0000,
					description: "Who's that? I'd like to meet them 🤝"
				}
			});
		}
	} else {
		let embed_fields = [];
		serverDocument.members.sort((a, b) => {
			return b.messages - a.messages;
		}).filter(a => {
			return msg.channel.guild.members.has(a._id);
		}).slice(0, 10).map(a => {
			embed_fields.push({
				name: `**@${bot.getName(msg.channel.guild, serverDocument, msg.channel.guild.members.get(a._id))}:**`,
				value: `${a.messages} message${a.messages==1 ? "" : "s"} this week`,
				inline: true
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
					description: "*This server is literally dead (✖╭╮✖)"
				}
			});
		}
	}
};