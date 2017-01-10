const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	unirest.get("http://tambal.azurewebsites.net/joke/random").header("Accept", "application/json").end(res => {
		if(res.status==200 && res.body.joke) {
			msg.channel.createMessage(res.body.joke);
		} else {
			msg.channel.createMessage("This command is a joke in itself 😞");
		}
	});
};