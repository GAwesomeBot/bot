const clearStats = require("./../../Modules/ClearServerStats.js");
const computeRankScore = require("./../../Modules/RankScoreCalculator.js");
const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix=="clear") {
		if(bot.getUserBotAdmin(msg.guild, serverDocument, msg.member)>=1) {
			clearStats(bot, db, winston, msg.guild, serverDocument, () => {
				msg.channel.createMessage("All done! 🐬 Server stats cleared");
			});
		} else {
			winston.warn(`Member '${msg.author.username}' is not an admin and cannot clear stats for server '${msg.guild.name}'`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage("Insufficient permissions to clear all stats 💪");
		}
	} else {
		const mostActiveMembers = serverDocument.members.sort((a, b) => {
			return computeRankScore(b.messages, b.voice) - computeRankScore(a.messages, a.voice);
		}).filter(a => {
			return msg.guild.members.has(a._id);
		}).slice(0, 5).map(a => {
			const score = computeRankScore(a.messages, a.voice);
			return `@${bot.getName(msg.guild, serverDocument, msg.guild.members.get(a._id))}: ${score} activity point${score==1 ? "" : "s"} (${a.messages} message${a.messages==1 ? "" : "s"}${a.voice>0 ? (`, ${moment.duration(a.voice*6000).humanize()} active on voice chat`) : ""})`;
		});
		const mostPlayedGames = serverDocument.games.sort((a, b) => {
			return b.time_played - a.time_played;
		}).slice(0, 5).map(a => {
			const time_played = a.time_played * 5;
			return `${a._id} played for ${moment.duration(time_played, "minutes").humanize()} total`;
		});
		const mostUsedCommands = serverDocument.command_usage ? Object.keys(serverDocument.command_usage).map(a => {
			return {
				_id: a,
				uses: serverDocument.command_usage[a]
			};
		}).sort((a, b) => {
			return b.uses - a.uses;
		}).slice(0, 5).map(a => {
			return `\`${a._id}\`, used ${a.uses} time${a.uses==1 ? "" : "s"}`;
		}) : [];
		db.users.find({
			_id: {
				$in: Array.from(msg.guild.members.keys())
			},
			points: {
				$gt: 0
			}
		}).sort({
			points: -1
		}).limit(5).exec((err, userDocuments) => {
			const richestMembers = userDocuments ? userDocuments.map(a => {
				return `@${bot.getName(msg.guild, serverDocument, msg.guild.members.get(a._id))}: ${a.points} AwesomePoint${a.points==1 ? "" : "s"}`;
			}) : [];

			const info = [
				`**☢ Most active members**\n\t${mostActiveMembers.join("\n\t") || "*The server has been dead this week*"}`,
				`**🎮 Most-played games**\n\t${mostPlayedGames.join("\n\t") || "*No one on this server plays games*"}`,
				`**🤑 Richest members**\n\t${richestMembers.join("\n\t") || "*Everyone on this server is really poor*"}`,
				`**ℹ️ Most-used commands**\n\t${mostUsedCommands.join("\n\t") || "*I haven't been used much this week*"}`
			];
			bot.sendArray(msg.channel, info);
		});
	}
};