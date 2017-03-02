const Trivia = require("./../../Modules/Trivia.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		const action = suffix.split(" ")[0].toLowerCase();
		if(action!="start" && !channelDocument.trivia.isOngoing) {
			msg.channel.createMessage(`There isn't an ongiong trivia game in this channel. 🍎 Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} start\` to get started.`);
			return;
		}

		let set;
		switch(action) {
			case "start":
				if(suffix.indexOf(" ")>-1) {
					set = suffix.substring(suffix.indexOf(" ")+1);
				}
				Trivia.start(bot, db, msg.channel.guild, serverDocument, msg.author, msg.channel, channelDocument, set);
				break;
			case "end":
			case ".":
				Trivia.end(bot, msg.channel.guild, serverDocument, msg.channel, channelDocument);
				break;
			case "skip":
			case "next":
				Trivia.next(bot, db, msg.channel.guild, serverDocument, msg.channel, channelDocument);
				break;
			default:
				Trivia.answer(bot, db, msg.channel.guild, serverDocument, msg.author, msg.channel, channelDocument, suffix);
				break;
		}
	} else {
		if(channelDocument.trivia.isOngoing) {
			msg.channel.createMessage(`**🎳 Trivia game${channelDocument.trivia.set=="default" ? "" : (` (set: ${channelDocument.trivia.set})`)}**\n${channelDocument.trivia.past_questions.length} question${channelDocument.trivia.past_questions.length==1 ? "" : "s"}\tScore: ${channelDocument.trivia.score}`);
		} else {
			msg.channel.createMessage(`Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} start\` 🎮`);
		}
	}
};
