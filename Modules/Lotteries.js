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
			channelDocument.lottery.isOngoing = true;
			channelDocument.lottery.expiry_timestamp = Date.now() + 3600000;
			channelDocument.lottery.creator_id = usr.id;
			channelDocument.lottery.participant_ids = [];
			channelDocument.lottery.multiplier = multiplier ? multiplier : 2;
			setTimeout(() => {
				module.exports.end(client, svr, serverDocument, ch, channelDocument);
			}, 3600000);
		}
	},
	end: async (client, svr, serverDocument, ch, channelDocument) => {
		const queryDocument = serverDocument.query.id("channels", channelDocument._id);

		if (channelDocument.lottery.isOngoing) {
			queryDocument.set("lottery.isOngoing", false);
			let winner;
			while (!winner && channelDocument.lottery.participant_ids.length > 1) {
				const i = Math.floor(Math.random() * channelDocument.lottery.participant_ids.length);
				const member = svr.members.get(channelDocument.lottery.participant_ids[i]);
				if (member) {
					winner = member;
				} else {
					channelDocument.lottery.participant_ids.splice(i, 1);
				}
			}
			queryDocument.set("lottery.participant_ids", []);
			try {
				if (winner) {
					const prize = Math.ceil(channelDocument.lottery.participant_ids.length * channelDocument.lottery.multiplier);
					const userDocument = await EUsers.findOne({ _id: winner.id });
					userDocument.query.set("points", userDocument.points + prize);
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
					});
				}
				return winner;
			} catch (err) {
				winston.debug(`An error occurred while attempting to end a lottery (*0*)\n`, err);
				client.logMessage(serverDocument, LoggingLevels.ERROR, `An error occurred while attempting to end the lottery.`, ch.id);
			}
		}
	},
};
