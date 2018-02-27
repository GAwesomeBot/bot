const moment = require("moment");

module.exports = async ({ Constants: { Colors } }, { serverDocument }, msg, commandData) => {
	const description = serverDocument.games.sort((a, b) => b.time_played - a.time_played)
		.slice(0, 8)
		.map(game => {
			let timePlayed = game.time_played * 5;
			return [
				`» **${game._id}** «`,
				`\tPlayed for **${moment.duration(timePlayed, "minutes").humanize()}** total this week.`,
			].join("\n");
		});
	if (description.length) {
		msg.send({
			embed: {
				color: Colors.SUCCESS,
				title: `Here ${description.length === 1 ? "is" : "are"} the top ${description.length} game${description.length === 1 ? "" : "s"} played in this server!`,
				description: description.join("\n\n"),
			},
		});
	} else {
		msg.send({
			embed: {
				color: Colors.INFO,
				title: `There's nothing to see here! 🎮`,
				description: `You should start playing some games, I know you want to!`,
			},
		});
	}
};
