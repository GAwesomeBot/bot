let multiplier = 1;
module.exports = {
	multiplier,
	start: (db, svr, serverDocument, usr, ch, channelDocument) => {
		if(!channelDocument.lottery.isOngoing) {
			channelDocument.lottery.isOngoing = true;
			channelDocument.lottery.expiry_timestamp = Date.now() + 3600000;
			channelDocument.lottery.creator_id = usr.id;
			channelDocument.lottery.participant_ids = [];
			serverDocument.save(() => {
				multiplier += 0.5;
				setTimeout(() => {
					module.exports.end(db, svr, serverDocument, ch, channelDocument);
				}, 3600000);
			});
		}
	},
	end: (db, svr, serverDocument, ch, channelDocument) => {
		if(channelDocument.lottery.isOngoing) {
			channelDocument.lottery.isOngoing = false;
			let winner;
			while(!winner && channelDocument.lottery.participant_ids.length>1) {
				const i = Math.floor(Math.random() * channelDocument.lottery.participant_ids.length);
				const member = svr.members.get(channelDocument.lottery.participant_ids[i]);
				if(member) {
					winner = member;
				} else {
					channelDocument.lottery.participant_ids.splice(i, 1);
				}
			}
			serverDocument.save(() => {
				if(winner) {
					const prize = Math.ceil(channelDocument.lottery.participant_ids.length * multiplier);
					db.users.findOrCreate({_id: winner.id}, (err, userDocument) => {
						if(!err && userDocument) {
							userDocument.points += prize;
						}
						const participantCount = channelDocument.lottery.participant_ids.filter((elem, i, self) => {
							return i == self.indexOf(elem);
						}).length;
						ch.createMessage({
							embed: {
                                author: {
                                    name: bot.user.username,
                                    icon_url: bot.user.avatarURL,
                                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                },
                                color: 0x00FF00,
								description: `Congratulations ${winner.mention}! 🎊 You won the lottery for **${prize}** AwesomePoints out of ${participantCount} participant${participantCount == 1 ? "" : "s"}. Enjoy the cash 💰`
							}
						});
					});
				}
			});
			return winner;
		}
	}
};
