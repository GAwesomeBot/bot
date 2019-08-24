/* eslint-disable max-len */

/**
 * Clear activity stats for a server
 * @param client The client instance
 * @param {Document} serverDocument The Server Document
 */
module.exports = async (client, serverDocument) => {
	const serverQueryDocument = serverDocument.query;

	// Rank members by activity score for the week
	const topMembers = [];
	const server = client.guilds.get(serverDocument._id);
	if (!server) return;
	await Promise.all(Object.values(serverDocument.members).map(async memberDocument => {
		if (!memberDocument) return;
		const member = server.members.get(memberDocument._id);
		const memberQueryDocument = serverQueryDocument.clone.id("members", memberDocument._id);
		if (member && member.id !== client.user.id && !member.user.bot) {
			const activityScore = memberDocument.messages + memberDocument.voice;
			topMembers.push([member, activityScore]);
			memberQueryDocument.inc("rank_score", activityScore / 10);
			const rank = await client.checkRank(server, serverDocument, serverDocument.query, member, memberDocument, true);
			memberQueryDocument.set("rank", rank || "");
			memberQueryDocument.set("messages", 0);
			memberQueryDocument.set("voice", 0);
		} else {
			if (!memberDocument._id && member) memberQueryDocument.set("_id", member.id);
			else if (!memberDocument._id) memberQueryDocument.set("_id", "UNKNOWN USER");
			memberQueryDocument.remove();
		}
	}));
	topMembers.sort((a, b) => a[1] - b[1]);

	/**
	 * Award points to Top 3
	 * @param member The affected member
	 * @param {Number} amount The amount of points to give the member
	 */
	const awardPoints = async (member, amount) => {
		const userDocument = await Users.findOne({ _id: member.id });
		if (userDocument) {
			userDocument.query.inc("points", amount);
			try {
				await userDocument.save();
			} catch (err) {
				logger.debug(`Failed to save user document for activity points.`, { usrid: member.id }, err);
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

	// Reset command data
	serverQueryDocument.set("command_usage", {});

	// Reset stats timestamp
	serverQueryDocument.set("stats_timestamp", Date.now());

	// Save changes to serverDocument
	try {
		await serverDocument.save();
		logger.verbose(`Cleared stats for server "${server}"`, { svrid: server.id });
	} catch (err) {
		logger.debug(`Failed to clear stats for server "${server}"`, { svrid: server.id }, err);
	}
};
