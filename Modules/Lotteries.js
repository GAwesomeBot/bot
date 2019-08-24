const multipliers = {
	small: 1,
	standard: 2,
	big: 5,
	huge: 10,
	massive: 100,
};
const { Colors, LoggingLevels } = require("../Internals/Constants.js");

module.exports = {
	multipliers,
	start: (client, svr, serverDocument, usr, ch, channelDocument, multiplier) => {
		if (!channelDocument.lottery.isOngoing) {
			const channelQueryDocument = serverDocument.query.id("channels", channelDocument._id).prop("lottery");

			channelQueryDocument.set("isOngoing", true)
				.set("expiry_timestamp", Date.now() + 3600000)
				.set("creator_id", usr.id)
				.set("participant_ids", [])
				.set("multiplier", multiplier ? multiplier : 2);
			setTimeout(async () => {
				const newServerDocument = await Servers.findOne(serverDocument._id);
				if (!newServerDocument || !newServerDocument.channels[channelDocument._id]) {
					logger.debug(`Failed to end lottery of channel that no longer exists.`, { svrid: svr.id, chid: channelDocument._id });
					client.logMessage(newServerDocument, "warn", "Could not end lottery in unknown channel.", ch.id);
				}
				module.exports.end(client, svr, newServerDocument, ch, newServerDocument.channels[channelDocument._id]);
				newServerDocument.save().catch(err => {
					logger.debug(`Failed to automatically end ongoing lottery.`, { svrid: svr.id }, err);
					client.logMessage(newServerDocument, "error", "Something went wrong while trying to end a lottery!", ch.id);
				});
			}, 3600000);
		}
	},
	end: async (client, svr, serverDocument, ch, channelDocument) => {
		const channelQueryDocument = serverDocument.query.id("channels", channelDocument._id);

		if (channelDocument.lottery.isOngoing) {
			channelQueryDocument.set("lottery.isOngoing", false);

			const participants = channelDocument.lottery.participant_ids.filter(a => svr.members.has(a));
			const i = Math.floor(Math.random() * participants.length);
			const winner = svr.members.get(participants[i]);
			try {
				if (winner) {
					const prize = Math.ceil(channelDocument.lottery.participant_ids.length * channelDocument.lottery.multiplier);
					const userDocument = await Users.findOne({ _id: winner.id });
					userDocument.query.inc("points", prize);
					try {
						await userDocument.save();
					} catch (_) {
						// Meh
					}
					const participantTotal = channelDocument.lottery.participant_ids.filter((ticket, index, array) => index === array.indexOf(ticket)).length;
					ch.send({
						content: `${winner},`,
						embed: {
							color: Colors.INFO,
							title: `Congratulations @__${client.getName(serverDocument, winner)}__! 🎊`,
							description: `You won the lottery for **${prize}** GAwesomePoint${prize === 1 ? "" : "s"} out of ${participantTotal} participant${participantTotal === 1 ? "" : "s"}.`,
							footer: {
								text: "Enjoy the cash! 💰",
							},
						},
					}).catch(err => {
						logger.debug("Failed to send Lottery message to channel.", { svrid: svr.id, chid: ch.id }, err);
					});
				}
				channelQueryDocument.set("lottery.participant_ids", []);
				return winner;
			} catch (err) {
				logger.debug(`An error occurred while attempting to end a lottery (*0*)`, { svrid: svr.id, chid: ch.id }, err);
				client.logMessage(serverDocument, LoggingLevels.ERROR, `An error occurred while attempting to end the lottery.`, ch.id);
			}
		}
	},
};
