const mstranslate = require("./../../Modules/MicrosoftTranslate.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const target = suffix.substring(suffix.lastIndexOf(" ")+1);
	suffix = suffix.substring(0, suffix.lastIndexOf(" "));
	if(suffix.endsWith(" to")) {
		suffix = suffix.substring(0, suffix.lastIndexOf(" to"));
	}
	const source = suffix.substring(suffix.lastIndexOf(" ")+1);
	const data = suffix.substring(0, suffix.lastIndexOf(" "));

	if(target && data && source == "?") {
		mstranslate.detect({text: data}, (err, res) => {
			if(err) {
				winston.error(`Failed to detect language for '${data}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
			} else {
				mstranslate.translate({text: data, from: res, to: target}, (err, res) => {
					if(err) {
						winston.error(`Failed to translate '${data}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
					} else {
						msg.channel.createMessage(`\`\`\`${res}\`\`\``);
					}
				});
			}
		});
	}
	else if(target && source && data) {
		mstranslate.translate({text: data, from: source, to: target}, (err, res) => {
			if(err) {
				winston.error(`Failed to translate '${data}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
			} else {
				msg.channel.createMessage(`\`\`\`${res}\`\`\``);
			}
		});
	} else {
		winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} Um i'm v confused. pls use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}\``);
	}
};
