const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	let embed_fields = [];
	serverDocument.games.sort((a, b) => {
		return b.time_played - a.time_played;
	}).slice(0, 10).map(a => {
		let time_played = a.time_played * 5;
		embed_fields.push({
			name: `**${a._id}** played for`,
			value: `${moment.duration(time_played, "minutes").humanize()} total this week`,
			inline: true
		});
	});
	if(embed_fields.length > 0) {
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x00FF00,
				fields: embed_fields
			}
		});
	} else {
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0xFF0000,
				description: "Nothing to see here 🎮"
			}
		});
	}
};
