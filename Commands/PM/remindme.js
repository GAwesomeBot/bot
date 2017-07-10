const remind = require("./../../Modules/ReminderParser.js");
const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, msg, suffix, commandData) => {
	if(suffix) {
		remind(bot, winston, userDocument, suffix, (err, time) => {
			if(!err && time) {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
                        description: `Alright, I'll remind you ${moment.duration(time).humanize(true)}`
					}
				});
			} else {
				winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {usrid: msg.author.id});
				msg.channel.createMessage(`Make sure you're using \`${commandData.name} ${commandData.usage}\`. I couldn't understand what you said last time`);
			}
		});
	} else {
		let info = [];
		userDocument.reminders.forEach(reminderDocument => {
			info.push({
				name: `__**${reminderDocument.name}**__`,
				value: `${moment(reminderDocument.expiry_timestamp).toNow()}`,
				inline: true
			});
		});
		if(info.empty || userDocument.reminders.length == 0) {
            msg.channel.createMessage({
                embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0xFF0000,
                    description: `No reminders set yet, use \`${commandData.name} ${commandData.usage}\` ⏰`
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
                    title: "Here are all the reminders you've set",
                    color: 0x9ECDF2,
                    fields: info
                }
            });
		}
	}
};