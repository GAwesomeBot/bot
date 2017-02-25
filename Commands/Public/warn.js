const ModLog = require("./../../Modules/ModerationLogging.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix) {
		let member, reason;
		if(suffix.indexOf("|") > -1 && suffix.length > 3) {
			member = bot.memberSearch(suffix.substring(0, suffix.indexOf("|")).trim(), msg.channel.guild);
			reason = suffix.substring(suffix.indexOf("|") + 1).trim();
		} else {
			member = bot.memberSearch(suffix, msg.channel.guild);
		}
		if(member) {
			if(member.user.bot || [msg.author.id, bot.user.id].indexOf(member.id) > -1 || bot.getUserBotAdmin(msg.channel.guild, serverDocument, member) > 0) {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						description: `Sorry, I can't warn / strike **@${bot.getName(msg.channel.guild, serverDocument, member)}** for some reason ✋`
					}
				});
			} else {
				let targetMemberDocument = serverDocument.members.id(member.id);
				if(!targetMemberDocument) {
					serverDocument.members.push({_id: member.id});
					targetMemberDocument = serverDocument.members.id(member.id);
				}
				targetMemberDocument.strikes.push({
					_id: msg.author.id,
					reason: reason || "No reason"
				});
				member.user.getDMChannel().then(ch => {
					ch.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0xFF0000,
							title: `You just got a warning / strike from **@${bot.getName(msg.channel.guild, serverDocument, msg.channel.guild.members.get(msg.author.id), true)}** on **${msg.channel.guild.name}**${reason ? ":" : ""}`,
							description: `${reason ? (`\`\`\`${reason}\`\`\``) : ""}`
						}
					});
					msg.channel.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0x00FF00,
							description: `Ok, **@${bot.getName(msg.channel.guild, serverDocument, member)}** now has ${targetMemberDocument.strikes.length} strike${targetMemberDocument.strikes.length == 1 ? "" : "s"} 🚦 I warned them via PM ⚠`
						}
					});
					ModLog.create(msg.channel.guild, serverDocument, "Warning", member, msg.member, reason);
				}).catch();
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
                description: "Who do you want me to warn? 😮 What should I warn them about?"
			}
		});
	}
};
