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
				description: `⭐ You have **${userDocument.points}** AwesomePoint${userDocument.points == 1 ? "" : "s"}`
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
						description: "Don't be silly, bots can't have points! 🤖"
					}
				});
			} else {
				db.users.findOrCreate({_id: member.id}, (err, targetUserDocument) => {
					let points = 0;
					if(!err && targetUserDocument) {
						points = targetUserDocument.points;
					}
					msg.channel.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0x00FF00,
							description: `⭐ **@${bot.getName(msg.channel.guild, serverDocument, member)}** has ${points} AwesomePoint${points == 1 ? "" : "s"}`
						}
					});
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
		db.users.find({
			_id: {
				$in: Array.from(msg.channel.guild.members.keys())
			},
			points: {
				$gt: 0
			}
		}).sort({
			points: -1
		}).limit(10).exec((err, userDocuments) => {
			userDocuments.map(a => {
				embed_fields.push({
					name: `**@${bot.getName(msg.channel.guild, serverDocument, msg.channel.guild.members.get(a._id))}:**`,
					value: `${a.points} AwesomePoint${a.points == 1 ? "" : "s"}`,
					inline: true
				});
            	});
			}).then(() => {
            if(embed_fields.length > 0) {
                msg.channel.createMessage({
                    embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						title: `Here are the ${embed_fields.length} users with the most points`,
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
                        description: "No one on this server has any points! Use `@user +1` to give upvote someone. 🌟"
                    }
                });
            }
		});
	}
};