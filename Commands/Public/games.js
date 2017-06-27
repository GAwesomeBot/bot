const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	let embed_fields = [];
	serverDocument.games.sort((a, b) => { //eslint-disable-line
		return b.time_played - a.time_played;
	}).slice(0, 10).map(a => {
		let time_played = a.time_played * 5;
		embed_fields.push({
			name: `"${a._id}" played for:`,
			value: `\`${moment.duration(time_played, "minutes").humanize()}\` total this week`,
			inline: false,
		});
	});
	if (embed_fields.length > 0) {
		msg.channel.createMessage({
			embed: {
				color: 0x00FF00,
				fields: embed_fields,
				footer: {
					text: `Fun fact: Gaming is the main reason Discord appeared!`,
				},
			},
		});
	} else {
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: "Nothing to see here 🎮",
				footer: {
					text: `Start playing games, I know you want to!`,
				},
			},
		});
	}
};
