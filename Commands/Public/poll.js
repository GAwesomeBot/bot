const { Polls } = require("../../Modules/");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");

module.exports = async ({ Constants: { Colors } }, { channelDocument, channelQueryDocument }, msg, commandData) => {
	if (channelDocument.poll.isOngoing) {
		if (msg.suffix) {
			const voteDocument = channelDocument.poll.responses.id(msg.author.id);
			if (voteDocument) {
				msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: `You've already voted in this poll.`,
						description: `PM me "${commandData.name} ${msg.guild.name}|#${msg.channel.name}" to erase your vote.`,
					},
				});
			} else {
				let vote;
				if (isNaN(msg.suffix)) {
					const i = channelDocument.poll.options.map(option => option.toLowerCase()).indexOf(msg.suffix.trim().toLowerCase());
					if (i > -1) {
						vote = i;
					}
				} else if (msg.suffix > 0 && msg.suffix <= channelDocument.poll.options.length) {
					vote = parseInt(msg.suffix.trim());
					vote--;
				}

				if (vote || vote === 0) {
					channelQueryDocument.push("poll.responses", {
						_id: msg.author.id,
						vote,
					});
					msg.send({
						embed: {
							color: Colors.SUCCESS,
							description: `I casted your vote for **${channelDocument.poll.options[vote]}** 🍻`,
						},
					});
				} else {
					msg.send({
						embed: {
							color: Colors.SOFT_ERR,
							description: `There's no matching option for \`${msg.suffix}\`. 😩`,
							footer: {
								text: `Please use the *number* (starting from 1) of your choice.`,
							},
						},
					});
				}
			}
		} else {
			const results = await Polls.getResults(channelDocument.poll);
			let map = [];
			channelDocument.poll.options.forEach((option, i) => {
				map.push([
					`» ${i + 1} « **${option}**`,
					`\t${results.votes[option].count} vote${results.votes[option].count === 1 ? "" : "s"} (${results.votes[option].percent}%)`,
				].join("\n"));
			});
			map = map.chunk(10);
			const descriptions = [];
			for (const innerArray of map) {
				descriptions.push(innerArray.join("\n"));
			}
			const menu = new PaginatedEmbed(msg, {
				footer: `So far, the winner is "${results.winner || "nobody!"}" They have the most votes out of ${channelDocument.poll.responses.length} total vote${channelDocument.poll.responses.length === 1 ? "" : "s"} ✅`,
				color: Colors.INFO,
				title: `🔮 Ongoing results for the poll "${channelDocument.poll.title}"`,
				description: `Use \`${msg.guild.commandPrefix}poll <no. of option>\` here or PM me \`poll ${msg.guild.name} | #${msg.channel.name}\` to vote. 🗳\n\n{description}`,
			}, {
				descriptions,
			});
			await menu.init();
		}
	} else {
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: `There isn't an ongoing poll in this channel. 🛡`,
				footer: {
					text: `PM me "${commandData.name} ${msg.guild.name} | #${msg.channel.name}" to start one.`,
				},
			},
		});
	}
};
