const { Utils: { ClearServerStats: clearStats, RankScoreCalculator: computeRankScore } } = require("../../Modules");
const moment = require("moment");

module.exports = async ({ Constants: { Colors, Text }, client }, { serverDocument }, msg, commandData) => {
	if (msg.suffix === "clear" && client.getUserBotAdmin(msg.guild, serverDocument, msg.member) >= 1) {
		await msg.send({
			embed: {
				color: Colors.PROMPT,
				title: `Waiting on @__${client.getName(serverDocument, msg.member)}__'s input...`,
				description: `Are you sure you want to reset this week's guild statistics? 🗑`,
				footer: {
					text: "This action cannot be undone!",
				},
			},
		});
		const response = (await msg.channel.awaitMessages(res => res.author.id === msg.author.id, { max: 1, time: 60000 })).first();
		response.delete().catch();
		if (response && response.content && configJS.yesStrings.includes(response.content.toLowerCase().trim())) {
			await clearStats(client, serverDocument);
			msg.send({
				embed: {
					color: Colors.SUCCESS,
					description: "Shwoom, your statistics have been reset! 🔥",
				},
			});
		} else {
			msg.send({
				embed: {
					color: Colors.INFO,
					description: "Your stats won't be fed to the shredder today. 📃",
				},
			});
		}
	} else if (msg.suffix === "clear") {
		msg.send({
			embed: {
				color: Colors.MISSING_PERMS,
				description: `You have insufficient permissions to clear all guild statistics 💪`,
				footer: {
					text: "Only Bot Admins can clear guild stats!",
				},
			},
		});
	} else {
		await msg.send({
			embed: {
				color: Colors.INFO,
				description: `Gathering stats for guild **${msg.guild.name}** ⌛`,
				footer: {
					text: "Please stand by...",
				},
			},
		});

		const mostActiveMembers = Object.values(serverDocument.members)
			.filter(a => msg.guild.members.has(a._id))
			.sort((a, b) => computeRankScore(b.messages, b.voice) - computeRankScore(a.messages, a.voice))
			.slice(0, 5)
			.map(a => {
				const score = computeRankScore(a.messages, a.voice);
				return `**@${client.getName(serverDocument, msg.guild.members.get(a._id))}**: ${score} activity point${score === 1 ? "" : "s"} (${a.messages} message${a.messages === 1 ? "" : "s"}${a.voice > 0 ? `, ${moment.duration(a.voice, "minutes").humanize()} active on voice chat` : ""})`;
			});

		const mostPlayedGames = serverDocument.games.sort((a, b) => b.time_played - a.time_played)
			.slice(0, 5)
			.map(a => {
				const timePlayed = a.time_played * 15;
				return `**${a._id}** played for ${moment.duration(timePlayed, "minutes").humanize()} total`;
			});

		const mostUsedCommands = serverDocument.command_usage ? Object.keys(serverDocument.command_usage).sort((a, b) => serverDocument.command_usage[b] - serverDocument.command_usage[a])
			.slice(0, 5)
			.map(a => `\`${a}\`, used ${serverDocument.command_usage[a]} time${serverDocument.command_usage[a] === 1 ? "" : "s"}`) : [];

		const userDocuments = await Users.find({
			_id: {
				$in: Array.from(msg.guild.members.keys()),
			},
			points: {
				$gt: 0,
			},
		}).limit(5).exec();

		const richestMembers = userDocuments ? userDocuments.map(a => `**@${client.getName(serverDocument, msg.guild.members.get(a._id))}**: ${a.points} GAwesomePoint${a.points === 1 ? "" : "s"}`) : [];

		const fields = [];
		fields.push({
			name: "**☢ Most active members**",
			value: `${mostActiveMembers.join("\n") || "*This guild has been dead this week*"}`,
		});
		fields.push({
			name: "**🎮 Most-played games**",
			value: `${mostPlayedGames.join("\n") || "*No one on this guild plays games*"}`,
		});
		fields.push({
			name: "**🤑 Richest members**",
			value: `${richestMembers.join("\n") || "*Everyone on this guild is really poor*"}`,
		});
		fields.push({
			name: "**ℹ Most-used commands**",
			value: `${mostUsedCommands.join("\n") || "*I haven't been used much this week*"}`,
		});

		msg.send({
			embed: {
				title: `This week's GAwesomeBot statistics for **${msg.guild.name}**`,
				color: Colors.RESPONSE,
				fields,
			},
		});
	}
};
