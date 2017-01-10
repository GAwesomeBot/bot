const remind = require("./../../Modules/ReminderParser.js");
const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, msg, suffix, commandData) => {
	if(suffix) {
		remind(bot, winston, userDocument, suffix, (err, time) => {
			if(!err && time) {
				msg.channel.createMessage(`Alright, I'll remind you ${moment.duration(time).humanize(true)}`);
			} else {
				winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {usrid: msg.author.id});
				msg.channel.createMessage(`Make sure you're using \`${commandData.name} ${commandData.usage}\`. I couldn't understand what you said last time`);
			}
		});
	} else {
		const info = [];
		userDocument.reminders.forEach(reminderDocument => {
			info.push(`\`${reminderDocument.name}\` ${moment(reminderDocument.expiry_timestamp).toNow()}`);
		});
		msg.channel.createMessage(info.join("\n") || `No reminders set yet, use \`${commandData.name} ${commandData.usage}\` ⏰`);
	}
};