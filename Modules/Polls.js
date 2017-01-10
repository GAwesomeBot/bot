module.exports = {
	start: (bot, svr, serverDocument, usr, ch, channelDocument, title, options) => {
		if(!channelDocument.poll.isOngoing) {
			channelDocument.poll.isOngoing = true;
			channelDocument.poll.created_timestamp = Date.now();
			channelDocument.poll.creator_id = usr.id;
			channelDocument.poll.title = title;
			channelDocument.poll.options = options;
			channelDocument.poll.responses = [];
			serverDocument.save(() => {
				const info = [
					`${usr.mention} has started a poll in this channel. 🗳 **${title}**\n\t${options.map((option, i) => {
						return `${i}) ${option}`;
					}).join("\n\t")}`,
					`Use \`${bot.getCommandPrefix(svr, serverDocument)}poll <no. of option>\` here or PM me \`poll ${svr.name}|#${ch.name}\` to vote.`
				];
				bot.sendArray(ch, info);
			});
		}
	},
	getResults: pollDocument => {
		const votes = {};
		let winner;
		let winnerCount = 0;
		pollDocument.options.forEach((option, i) => {
			const count = pollDocument.responses.reduce((n, voteDocument) => {
				return n + (voteDocument.vote==i);
			}, 0);
			if(count>winnerCount) {
				winner = option;
				winnerCount = count;
			} else if(count==winnerCount) {
				winner = null;
			}
			votes[option] = {
				count,
				percent: (Math.round(((count / pollDocument.responses.length) * 100) * 100) / 100) || 0
			};
		});
		return {
			votes,
			winner
		};
	},
	end: (serverDocument, ch, channelDocument) => {
		if(channelDocument.poll.isOngoing) {
			channelDocument.poll.isOngoing = false;
			serverDocument.save(() => {
				const results = module.exports.getResults(channelDocument.poll);
				const info = channelDocument.poll.options.map(option => {
					return `${option}: ${results.votes[option].count} vote${results.votes[option].count==1 ? "" : "s"} (${results.votes[option].percent}%)`;
				});
				ch.createMessage(`The poll **${channelDocument.poll.title}** has ended. 🔔 Here are the results:\n\t${info.join("\n\t")}\nThe winner is...**${results.winner || "tie!"}** out of ${channelDocument.poll.responses.length} vote${channelDocument.poll.responses.length==1 ? "" : "s"} 🎉`);
			});
		}
	}
};
