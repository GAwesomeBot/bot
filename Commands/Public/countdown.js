const setCountdown = require("./../../Modules/SetCountdown.js");
const moment = require("moment");
const parseDuration = require("parse-duration");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		if(suffix.indexOf("|") > -1 && suffix.length >= 3) {
			const args = [
				suffix.substring(0, suffix.indexOf("|")).trim(),
				suffix.substring(suffix.indexOf("|") + 1).trim()
			];
			let countdownDocument = serverDocument.config.countdown_data.id(args[0]);
			if(countdownDocument) {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x9ECDF2,
						description: `**${countdownDocument._id}** already exists. ⏰ Wait until it expires.`
					}
				});
			} else {
				const time = parseDuration(args[1]);
				if(time > 0) {
					const expiry = Date.now() + time;
					serverDocument.config.countdown_data.push({
						_id: args[0],
						channel_id: msg.channel.id,
						expiry_timestamp: expiry
					});
					countdownDocument = serverDocument.config.countdown_data.id(args[0]);
					setCountdown(bot, winston, serverDocument, countdownDocument);
					msg.channel.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0x00FF00,
							description: `Alright, set **${args[0]}** to expire ${moment(expiry).fromNow()} 🙃`
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
							description: `\`${args[1]}\` is not a valid length of time`
						}
					});
				}
			}
		} else {
			const countdownDocument = serverDocument.config.countdown_data.id(suffix);
			if(countdownDocument) {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						description: `${countdownDocument._id} expires ${moment(countdownDocument.expiry_timestamp).fromNow()} ⌛`
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
						description: `That countdown doesn't exist. Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${suffix}|<time>\` to create it.`
					}
				});
			}
		}
	} else {
		let embed_fields = [];
		serverDocument.config.countdown_data.filter(countdownDocument => {
			return msg.channel.guild.channels.has(countdownDocument.channel_id);
		}).sort((a, b) => {
			return a.expiry_timestamp - b.expiry_timestamp;
		}).map(countdownDocument => {
			embed_fields.push({
				name: `${countdownDocument._id}: in #${msg.channel.guild.channels.get(countdownDocument.channel_id).name}`,
				value: ` ${moment(countdownDocument.expiry_timestamp).fromNow()}`,
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
					title: `**⏱ ${embed_fields.length} countdown${embed_fields.length==1 ? "" : "s"} on this server**`,
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
					description: `There aren't any countdowns on this server. Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <event>|<time from now>\` to create one. 🐬`
				}
			});
		}
	}
};
