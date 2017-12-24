const { Polls } = require("../../Modules/");

module.exports = async (main, { serverDocument, channelDocument }, msg, commandData) => {
	if (channelDocument.poll.isOngoing) {
		if (msg.suffix) {
			const voteDocument = channelDocument.poll.responses.id(msg.author.id);
			if (voteDocument) {
				msg.channel.send({
					embed: {
						color: 0xFF0000,
						description: `You've already voted in this poll. PM me \`${commandData.name} ${msg.channel.guild.name}|#${msg.channel.name}\` to erase your vote.`,
					},
				});
			} else {
				let vote;
				if (isNaN(msg.suffix)) {
					const i = channelDocument.poll.options.map(option => option.toLowerCase()).indexOf(msg.suffix);
					if (i > -1) {
						vote = i;
					}
				} else if (msg.suffix >= 0 && msg.suffix < channelDocument.poll.options.length) {
					vote = parseInt(msg.suffix);
				}
				if (vote) {
					channelDocument.poll.responses.push({
						_id: msg.author.id,
						vote,
					});
					msg.channel.send({
						embed: {
							color: 0x00FF00,
							description: `I recorded your vote for **${channelDocument.poll.options[vote]}** 🍻`,
						},
					});
				} else {
					msg.channel.send({
						embed: {
							color: 0xFF0000,
							description: `There's no matching option for \`${msg.suffix}\`. 😩\nPlease use the *number* (starting from 0) of your choice.`,
						},
					});
				}
			}
		} else {
			const results = await Polls.getResults(channelDocument.poll);
			let embed_fields = [];
			channelDocument.poll.options.map((option, i) => {
				embed_fields.push({
					name: `(${i}) ${option}:`,
					value: `${results.votes[option].count} vote${results.votes[option].count === 1 ? "" : "s"} (${results.votes[option].percent}%)`,
					inline: true,
				});
			});
			msg.channel.send({
				embed: {
					color: 0x3669FA,
					title: `🔮 Ongoing results for the poll "${channelDocument.poll.title}"`,
					description: `Use \`${main.bot.getCommandPrefix(msg.channel.guild, serverDocument)}poll <no. of option>\` here or PM me \`poll ${msg.channel.guild.name}|#${msg.channel.name}\` to vote 🗳`,
					fields: embed_fields,
					footer: {
						text: `So far, the winner is "${results.winner || "nobody!"}" They have the most votes out of ${channelDocument.poll.responses.length} vote${channelDocument.poll.responses.length === 1 ? "" : "s"} total ☑`,
					},
				},
			});
		}
	} else {
		msg.channel.send({
			embed: {
				color: 0xFF0000,
				description: `There is no ongoing poll in this channel. 🛡`,
				footer: {
					text: `PM me \`${commandData.name} ${msg.channel.guild.name}|#${msg.channel.name}\` to start one.`,
				},
			},
		});
	}
};
