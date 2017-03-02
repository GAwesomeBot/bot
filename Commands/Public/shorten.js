const auth = require("./../../Configuration/auth.json");
const googl = require("goo.gl");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		googl.setKey(serverDocument.config.custom_api_keys.google_api_key || auth.tokens.google_api_key);
		if(suffix.toLowerCase().indexOf("http://goo.gl/")==0 || suffix.toLowerCase().indexOf("https://goo.gl/")==0 || suffix.toLowerCase().indexOf("goo.gl/")==0) {
			googl.expand(suffix).then(url => {
				msg.channel.createMessage(`<${url}>`);
			}).catch(err => {
				winston.warn(`Failed to expand URL '${suffix}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
				msg.channel.createMessage("An error occurred. *That's all we know.*");
			});
		} else {
			googl.shorten(suffix).then(url => {
				msg.channel.createMessage(`<${url}>`);
			}).catch(err => {
				winston.warn(`Failed to shorten URL '${suffix}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
				msg.channel.createMessage("An error occurred. *That's all we know.*");
			});
		}
	} else {
		winston.warn(`Parameters not provided for '${commandData.name}' command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} You humans are confusing. 😕 How am I supposed to know the URL?!`);
	}
};