const computeRankScore = require("./RankScoreCalculator.js");

// Clear activity stats for a server
module.exports = (bot, db, winston, svr, serverDocument, callback) => {
	// Rank members by activity score for the week
	const topMembers = [];
	serverDocument.members.forEach(memberDocument => {
		const member = svr.members.get(memberDocument._id);
		if(member && member.id!=bot.user.id && !member.user.bot) {
			const activityScore = computeRankScore(memberDocument.messages, memberDocument.voice);
			topMembers.push([member, activityScore]);
			memberDocument.rank_score += activityScore / 10;
			memberDocument.rank = bot.checkRank(winston, svr, serverDocument, member, memberDocument, true);
			memberDocument.messages = 0;
			memberDocument.voice = 0;
		} else {
			memberDocument.remove();
		}
	});
	topMembers.sort((a, b) => {
		return a[1] - b[1];
	});

	// Award points to top 3
	const awardPoints = (member, amount) => {
		db.users.findOrCreate({_id: member.id}, (err, userDocument) => {
			if(!err && userDocument) {
				userDocument.points += amount;
			} else {
				winston.error(`Failed to create user data for '${member.user.username}' to award activity points on server '${svr.name}'`, {usrid: member.id});
			}
		});

	};
	if(serverDocument.config.commands.points.isEnabled && svr.members.size>2) {
		for(let i=topMembers.length-1; i>topMembers.length-4; i--) {
			if(i>=0) {
				awardPoints(topMembers[i][0], topMembers[i][1]);
			}
		}
	}

	// Reset game and command data
	serverDocument.games = [];
	serverDocument.command_usage = {};
	serverDocument.markModified("command_usage");

	// Reset stats timestamp
	serverDocument.stats_timestamp = Date.now();

	// Save changes to serverDocument
	serverDocument.save(err => {
		if(err) {
			winston.error(`Failed to clear stats for server '${svr.name}'`, {svrid: svr.id});
		} else {
			winston.info(`Cleared stats for server '${svr.name}'`, {svrid: svr.id});
		}
		callback();
	});
};
