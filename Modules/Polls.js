const PaginatedEmbed = require("./MessageUtils/PaginatedEmbed");
const { Colors } = require("../Internals/Constants");

module.exports = {
	start: async (client, svr, serverDocument, usr, ch, channelDocument, title, options) => {
		const pollQueryDocument = serverDocument.query.id("channels", channelDocument._id).prop("poll");

		if (!channelDocument.poll.isOngoing) {
			pollQueryDocument.set("isOngoing", true)
				.set("created_timestamp", Date.now())
				.set("creator_id", usr.id)
				.set("title", title)
				.set("options", options)
				.set("responses", []);

			let map = options.map((option, i) => [
				`» ${i + 1} «`,
				`\t**${option}**`,
			].join("\n"));
			map = map.chunk(10);
			const descriptions = [];
			for (const innerArray of map) {
				descriptions.push(innerArray.join("\n"));
			}
			const menu = new PaginatedEmbed({
				channel: ch,
				author: {
					id: usr.id,
				},
			}, {
				title: `🍻 A poll named "__${title}__" has started!`,
				color: Colors.INFO,
				description: `${usr} has started a poll in here! Run \`${svr.commandPrefix}poll\` to see all available choices!\nThe following options are available:\n\n{description}`,
				footer: `Use "${svr.commandPrefix}poll <option no.>" here or PM me "poll ${svr}|#${ch.name}" to vote.`,
			}, {
				descriptions,
			});
			await menu.init();
		}
	},
	getResults: async pollDocument => {
		const votes = {};
		let winner;
		let winnerCount = 0;
		const options = {};
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
		const pollQueryDocument = serverDocument.query.id("channels", channelDocument._id).prop("poll");

		if (channelDocument.poll.isOngoing) {
			pollQueryDocument.set("isOngoing", false);
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
			}).catch(err => {
				logger.debug(`Failed to send Polls message to channel.`, { svrid: serverDocument._id, chid: ch.id }, err);
			});
		}
	},
};
