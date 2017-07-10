const ModLog = require("./../../Modules/ModerationLogging.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const args = suffix.split(" ");
	if(suffix && args.length >= 2) {
		ModLog.update(msg.channel.guild, serverDocument, args[0].trim(), {
			reason: suffix.substring(suffix.indexOf(" ") + 1).trim()
		}, err => {
			if(err) {
				msg.channel.createMessage(err);
			} else {
				msg.channel.createMessage("Done ✅");
			}
		});
	} else {
		winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} Make sure to use the syntax \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}\`.`);
	}
};
