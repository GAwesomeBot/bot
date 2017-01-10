const translate = require("./../../Modules/MicrosoftTranslate.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const target = suffix.substring(suffix.lastIndexOf(" ")+1);
	suffix = suffix.substring(0, suffix.lastIndexOf(" "));
	if(suffix.endsWith(" to")) {
		suffix = suffix.substring(0, suffix.lastIndexOf(" to"));
	}
	const source = suffix.substring(suffix.lastIndexOf(" ")+1);
	const text = suffix.substring(0, suffix.lastIndexOf(" "));

	if(target && source && text) {
		translate(text, source, target, (err, res) => {
			if(err) {
				winston.error(`Failed to translate '${text}'`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
			} else {
				msg.channel.createMessage(`\`\`\`${res.translated_text}\`\`\``);
			}
		});
	} else {
		winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} Um i'm v confused. pls use \`${bot.getCommandPrefix(msg.guild, serverDocument)}${commandData.name} ${commandData.usage}\``);
	}
};