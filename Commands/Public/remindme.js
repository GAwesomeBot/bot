const remind = require("./../../Modules/ReminderParser.js");
const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		remind(bot, winston, userDocument, suffix, (err, time) => {
			if(!err && time) {
				msg.channel.createMessage(`Alright, I'll remind ${msg.author.mention} via PM ${moment.duration(time).humanize(true)}`);
			} else {
				winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage(`${msg.author.mention} Make sure you're using \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}\`. I couldn't understand what you said last time`);
			}
		});
	} else {
		winston.warn(`Parameters not provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} I need something to remind you of 😣. Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}\``);
	}
};
