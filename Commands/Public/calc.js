const mathjs = require("mathjs");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		try {
			msg.channel.createMessage(`\`\`\`${mathjs.eval(suffix)}\`\`\``);
		} catch(err) {
			msg.channel.createMessage(`\`\`\`${err}\`\`\``);
		}
	} else {
		winston.warn(`Parameters not provided for ${commandData.name} command`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} I need something to calculate 🙄`);
	}
};
