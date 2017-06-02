const moment = require("moment");
const parseDuration = require("parse-duration");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let timestr = "";
	const time = parseDuration(suffix);
	if(!suffix) {
		if(channelDocument.command_cooldown > 0) {
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
					description: `Cooldown of ${moment.duration(channelDocument.command_cooldown).humanize()} in place right now (in this channel) ⏱`
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
                    color: 0x00FF00,
					description: "No command cooldown in this channel!!!11 🎢"
				}
			});
		}
		return;
	} else if(suffix == ".") {
		channelDocument.command_cooldown = 0;
		channelDocument.isCommandCooldownOngoing = false;
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x00FF00,
				description: "Vroom vroom ⏩"
			}
		});
		return;
	} else if(suffix.split("|").length == 2 && parseDuration(suffix.split("|")[0]) > 0 && parseDuration(suffix.split("|")[1]) > 0) {
		const time1 = parseDuration(suffix.split("|")[0]);
		const time2 = parseDuration(suffix.split("|")[1]);
		if(time1 > 300000 || time2 > 3600000) {
			winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage({
				embed: {
					author: {
                    	name: bot.user.username,
                   	 	icon_url: bot.user.avatarURL,
						url: "https://github.com/GilbertGobbels/GAwesomeBot"
                	},
                    color: 0xFF0000,
					description: "The numbers you've provided are too big!"
				}
			});
			return;
		}
		timestr = ` of ${moment.duration(time1).humanize()} for ${moment.duration(time2).humanize()}`;
		channelDocument.command_cooldown = time1;
		setTimeout(() => {
			channelDocument.command_cooldown = 0;
			serverDocument.save(err => {
				if(err) {
					winston.error("Failed to save server data for command cooldown", {svrid: msg.channel.guild._id}, err);
				}
			});
		}, time2);
	} else if(time > 0) {
		if(time > 300000) {
			winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
            msg.channel.createMessage({
                embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0xFF0000,
                    description: "The numbers you've provided are too big!"
                }
            });
			return;
		}
		timestr = ` of ${moment.duration(time).humanize()}`;
		channelDocument.command_cooldown = time;
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
				description: "You seem confused 🤔"
			}
		});
		return;
	}
	msg.channel.createMessage({
		embed: {
            author: {
                name: bot.user.username,
                icon_url: bot.user.avatarURL,
                url: "https://github.com/GilbertGobbels/GAwesomeBot"
            },
            color: 0x00FF00,
			description: `Created command cooldown ${timestr} in this channel ⏲`
		}
	});
};
