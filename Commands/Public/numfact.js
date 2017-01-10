const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const number = suffix || "random";
	if(suffix && isNaN(suffix)) {
		winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`\`${suffix}\` is not a number!`);
	} else {
		unirest.get(`http://numbersapi.com/${number}`).end(res => {
			if(res.status==200) {
				msg.channel.createMessage(res.body);
			} else {
				winston.warn(`Failed to fetch number fact for '${number}'`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage("Oh no! 😤 Something went wrong.");
			}
		});
	}
};
