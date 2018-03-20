const moment = require("moment");

module.exports = async ({ Constants: { Colors } }, { serverDocument }, msg, commandData) => {
	const sortedGames = serverDocument.games.sort((a, b) => b.time_played - a.time_played);
	const totalTime = sortedGames.reduce((a, b) => (a.time_played || a) + b.time_played, 0) * 5;
	const totalGames = sortedGames.length;
	const description = sortedGames
		.slice(0, 8)
		.map(game => {
			const timePlayed = game.time_played * 5;
			const timeStringSplit = moment.duration(timePlayed, "minutes").humanize().split(" ");
			return [
				`» **${game._id}** «`,
				`\t**${timeStringSplit[0]}** ${timeStringSplit[1]}`,
			].join("\n");
		});
	if (description.length) {
		msg.send({
			embed: {
				color: Colors.SUCCESS,
				title: `Here ${description.length === 1 ? "is" : "are"} the ${description.length === 1 ? "only game" : `top ${description.length} games`} played in this server this week!`,
				description: description.join("\n\n"),
				footer: {
					text: `There were ${totalGames} games played this week with a combined playtime of ${moment.duration(totalTime, "minutes").humanize()}!`,
				},
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
