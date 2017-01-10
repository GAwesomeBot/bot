const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	let num = suffix;
	if(!num) {
		num = 1;
	}

	if(isNaN(num) || num<1 || num>serverDocument.config.command_fetch_properties.max_count) {
		num = serverDocument.config.command_fetch_properties.default_count;
	}
	unirest.get(`http://catfacts-api.appspot.com/api/facts?number=${num}`).header("Accept", "application/json").end(res => {
		if(res.status==200) {
			bot.sendArray(msg.channel, JSON.parse(res.body).facts);
		} else {
			winston.error("Failed to fetch cat fact(s)", {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage("Cats exist and are cute af. 😻");
		}
	});
};
