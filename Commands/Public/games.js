const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	msg.channel.createMessage(serverDocument.games.sort((a, b) => {
		return b.time_played - a.time_played;
	}).slice(0, 10).map(a => {
		const time_played = a.time_played * 5;
		return `**${a._id}** played for ${moment.duration(time_played, "minutes").humanize()} total this week`;
	}).join("\n") || "Nothing to see here 🎮");
};
