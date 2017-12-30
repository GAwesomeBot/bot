/* eslint-disable max-len */

/**
 * Clear activity stats for a server
 * @param bot The bot instance
 * @param {Guild} server The server which has its stats cleared
 * @param serverDocument The Server Document
 */
module.exports = async (bot, server, serverDocument) => {
	// Rank members by activity score for the week
	const topMembers = [];
	await Promise.all(serverDocument.members.map(async memberDocument => {
		const member = server.members.get(memberDocument._id);
		if (member && member.id !== bot.user.id && !member.user.bot) {
			const activityScore = memberDocument.messages + memberDocument.voice;
			topMembers.push([member, activityScore]);
			memberDocument.rank_score += activityScore / 10;
			memberDocument.rank = await bot.checkRank(server, serverDocument, member, memberDocument, true);
			memberDocument.messages = 0;
			memberDocument.voice = 0;
		} else {
			memberDocument.remove();
		}
	}));
	topMembers.sort((a, b) => a[1] - b[1]);

	/**
	 * Award points to Top 3
	 * @param member The affected member
	 * @param {Number} amount The amount of points to give the member
	 */
	const awardPoints = async (member, amount) => {
		/**
		 * Check https://www.npmjs.com/package/mongoose-findorcreate#promise-support
		 */
		const findOrCreate = await Users.findOrCreate({ _id: member.id }).catch(err => {
			winston.warn(`Failed to find or create user data for "${member.user.tag}" to award activity points on server "${server}"`, { usrid: member.id }, err);
		});
		const userDocument = findOrCreate.doc;
		if (userDocument) {
			userDocument.points += amount;
			try {
				await userDocument.save();
			} catch (err) {
				winston.warn(`Failed to save user document for activity points`, { usrid: member.id }, err);
			}
		}
	};
	if (serverDocument.config.commands.points.isEnabled && server.members.size > 2) {
		const promiseArray = [];
		for (let i = topMembers.length - 1; i > topMembers.length - 4; i--) {
			if (i >= 0) {
				promiseArray.push(awardPoints(topMembers[i][0], topMembers[i][1]));
			}
		}
		await Promise.all(promiseArray);
	}

	// Reset game and command data
	serverDocument.games = [];
	serverDocument.command_usage = {};
	serverDocument.markModified("command_usage");

	// Reset stats timestamp
	serverDocument.stats_timestamp = Date.now();

	// Save changes to serverDocument
	try {
		await serverDocument.save();
		winston.debug(`Cleared stats for server "${server}"`, { svrid: server.id });
	} catch (err) {
		winston.warn(`Failed to clear stats for server "${server}"`, { svrid: server.id }, err);
	}
};
