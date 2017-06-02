const clearStats = require("./../../Modules/ClearServerStats.js");
const computeRankScore = require("./../../Modules/RankScoreCalculator.js");
const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix === "clear") {
		if(bot.getUserBotAdmin(msg.channel.guild, serverDocument, msg.member) >= 1) {
			clearStats(bot, db, winston, msg.channel.guild, serverDocument, () => {
				msg.channel.createMessage("All done! 🐬 Server stats cleared");
			});
		} else {
			winston.warn(`Member '${msg.author.username}' is not an admin and cannot clear stats for server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage("Insufficient permissions to clear all stats 💪");
		}
	} else {
		const mostActiveMembers = serverDocument.members.sort((a, b) => {
			return computeRankScore(b.messages, b.voice) - computeRankScore(a.messages, a.voice);
		})
		.filter(a => {
			return msg.channel.guild.members.has(a._id);
		})
		.slice(0, 5)
		.map(a => {
			const score = computeRankScore(a.messages, a.voice);
			return `@${bot.getName(msg.channel.guild, serverDocument, msg.channel.guild.members.get(a._id))}: ${score} activity point${score === 1 ? "" : "s"} (${a.messages} message${a.messages === 1 ? "" : "s"}${a.voice > 0 ? (`, ${moment.duration(a.voice, "minutes").humanize()} active on voice chat`) : ""})`;
		});

		const mostPlayedGames = serverDocument.games.sort((a, b) => {
			return b.time_played - a.time_played;
		})
		.slice(0, 5)
		.map(a => {
			const time_played = a.time_played * 15;
			return `${a._id} played for ${moment.duration(time_played, "minutes").humanize()} total`;
		});

		const mostUsedCommands = serverDocument.command_usage ? Object.keys(serverDocument.command_usage).map(a => {
			return {
				_id: a,
				uses: serverDocument.command_usage[a]
			};
		})
		.sort((a, b) => {
			return b.uses - a.uses;
		})
		.slice(0, 5).map(a => {
			return `\`${a._id}\`, used ${a.uses} time${a.uses === 1 ? "" : "s"}`;
		}) : [];

		db.users.find({
			_id: {
				$in: Array.from(msg.channel.guild.members.keys())
			},
			points: {
				$gt: 0
			}
		})
		.sort({
			points: -1
		})
		.limit(5).exec((err, userDocuments) => {
			const richestMembers = userDocuments ? userDocuments.map(a => {
				return `@${bot.getName(msg.channel.guild, serverDocument, msg.channel.guild.members.get(a._id))}: ${a.points} AwesomePoint${a.points === 1 ? "" : "s"}`;
			}) : [];

			let embed_fields = [];

			embed_fields.push({
				name: "**☢ Most active members**",
				value: `${mostActiveMembers.join("\n") || "*The server has been dead this week*"}`,
				inline: false
			});

			embed_fields.push({
				name: "**🎮 Most-played games**",
				value: `${mostPlayedGames.join("\n") || "*No one on this server plays games*"}`,
				inline: false
			});

			embed_fields.push({
				name: "**🤑 Richest members**",
				value: `${richestMembers.join("\n") || "*Everyone on this server is really poor*"}`,
				inline: false
			});

			embed_fields.push({
				name: "**ℹ Most-used commands**",
				value: `${mostUsedCommands.join("\n") || "*I haven't been used much this week*"}`,
				inline: false
			});

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
		});
	}
};
