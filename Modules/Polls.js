module.exports = {
	start: async (bot, svr, serverDocument, usr, ch, channelDocument, title, options) => {
		if (!channelDocument.poll.isOngoing) {
			channelDocument.poll.isOngoing = true;
			channelDocument.poll.created_timestamp = Date.now();
			channelDocument.poll.creator_id = usr.id;
			channelDocument.poll.title = title;
			channelDocument.poll.options = options;
			channelDocument.poll.responses = [];
			let embed_fields = [];
			options.forEach((option, i) => {
				embed_fields.push({
					name: `${i}`,
					value: `${option}`,
					inline: true,
				});
			});
			ch.send({
				embed: {
					author: {
						name: bot.user.username,
						icon_url: bot.user.avatarURL(),
						url: "https://github.com/GilbertGobbels/GAwesomeBot",
					},
					description: `${usr} has started a poll in this channel named **${title}**🗳
													\nUse \`${bot.getCommandPrefix(svr, serverDocument)}poll <no. of option>\` here or PM me \`poll ${svr.name}|#${ch.name}\` to vote.
													\nThe following options are available:`,
					color: 0x3669FA,
					fields: embed_fields,
				},
			});
		}
	},
	getResults: async pollDocument => {
		const votes = {};
		let winner;
		let winnerCount = 0;
		let options = {};
		pollDocument.options.forEach((option, i) => {
			options[i] = {
				id: i,
				votes: 0,
				option,
			};
		});
		pollDocument.responses.forEach(voteDocument => {
			if (options[voteDocument.vote]) options[voteDocument.vote].votes++;
		});
		Object.values(options).forEach(option => {
			if (option.votes > winnerCount) {
				winner = option.option;
				winnerCount = option.votes;
			} else if (option.votes === winnerCount) {
				winner = null;
			}
			votes[option.option] = {
				count: option.votes,
				percent: (Math.round(((option.votes / pollDocument.responses.length) * 100) * 100) / 100) || 0,
			};
		});
		return {
			votes,
			winner,
		};
	},
	end: async (serverDocument, ch, channelDocument) => {
		if (channelDocument.poll.isOngoing) {
			channelDocument.poll.isOngoing = false;
			const results = await module.exports.getResults(channelDocument.poll);
			const fields = channelDocument.poll.options.map(option => ({
				name: option,
				value: `${results.votes[option].count} vote${results.votes[option].count === 1 ? "" : "s"} (${results.votes[option].percent}%)`,
				inline: true,
			}));
			ch.send({
				embed: {
					color: 0x3669FA,
					title: `The poll "${channelDocument.poll.title}" has ended. 🔔`,
					description: `Here are the results:`,
					fields,
					footer: {
						text: `${results.winner ? `The winner is... "${results.winner}"! They won out of ${channelDocument.poll.responses.length} vote${channelDocument.poll.responses.length === 1 ? "" : "s"} 🎉
						` : `The results ended in a tie! Nobody won today :(`}`,
					},
				},
			});
		}
	},
};
