const urban = require("urban");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	const showNoResult = () => {
		msg.channel.createMessage("Wtf?! Urban Dicitonary doesn't have anything to say 🚨");
	};
	
	const showWord = data => {
		if(data) {
			msg.channel.createMessage(`📖 **${data.word}** by ${data.author}\t${data.thumbs_up} 👍\t<${data.permalink}>\`\`\`${data.definition}\`\`\``);
		} else {
			showNoResult();
		}
	};

	if(suffix) {
		urban(suffix).first(showWord);
	} else {
		urban.random().first(showWord);
	}
};
