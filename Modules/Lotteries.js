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
				module.exports.end(client, svr, newServerDocument, ch, newServerDocument.channels[channelDocument._id]);
			}, 3600000);
		}
	},
	end: async (client, svr, serverDocument, ch, channelDocument) => {
		const channelQueryDocument = serverDocument.query.id("channels", channelDocument._id);

		if (channelDocument.lottery.isOngoing) {
			channelQueryDocument.set("lottery.isOngoing", false);
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
			channelQueryDocument.set("lottery.participant_ids", []);
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
