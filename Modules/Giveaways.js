module.exports = {
	start: (bot, svr, serverDocument, usr, ch, channelDocument, title, secret, duration) => {
		if(!channelDocument.giveaway.isOngoing) {
			channelDocument.giveaway.isOngoing = true;
			channelDocument.giveaway.expiry_timestamp = Date.now() + duration;
			channelDocument.giveaway.creator_id = usr.id;
			channelDocument.giveaway.title = title;
			channelDocument.giveaway.secret = secret;
			channelDocument.giveaway.participant_ids = [];
			serverDocument.save(() => {
				ch.createMessage(`${usr.mention} has started a giveaway: **${title}**! Use \`${bot.getCommandPrefix(svr, serverDocument)}giveaway enroll\` for a chance to win. Good luck! 🍻`);
				setTimeout(() => {
					module.exports.end(bot, svr, serverDocument, ch, channelDocument);
				}, duration);
			});
		}
	},
	end: (bot, svr, serverDocument, ch, channelDocument) => {
		if(channelDocument.giveaway.isOngoing) {
			channelDocument.giveaway.isOngoing = false;
			let winner;
			while(!winner && channelDocument.giveaway.participant_ids.length>0) {
				const i = Math.floor(Math.random() * channelDocument.giveaway.participant_ids.length);
				const member = svr.members.get(channelDocument.giveaway.participant_ids[i]);
				if(member) {
					winner = member;
				} else {
					channelDocument.giveaway.participant_ids.splice(i, 1);
				}
			}
			serverDocument.save(() => {
				if(winner) {
					ch.createMessage(`Congratulations **@${bot.getName(svr, serverDocument, winner)}**! 🎊 You won the giveaway **${channelDocument.giveaway.title}** out of ${channelDocument.giveaway.participant_ids.length} ${channelDocument.giveaway.participant_ids.length==1 ? "person" : "people"}.`);
					winner.user.getDMChannel().then(channel => {
						channel.createMessage(`Congratulations! 🎁😁 You won the giveaway in #${ch.name} on ${svr.name}:\`\`\`${channelDocument.giveaway.secret}\`\`\``);
					});
				}
			});
			return winner;
		}
		return;
	}
};
