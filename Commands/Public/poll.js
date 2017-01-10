const Polls = require("./../../Modules/Polls.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(channelDocument.poll.isOngoing) {
		if(suffix) {
			const voteDocument = channelDocument.poll.responses.id(msg.author.id);
			if(voteDocument) {
				msg.channel.createMessage(`You've already voted in this poll. PM me \`${commandData.name} ${msg.guild.name}|#${msg.channel.name}\` to erase your vote.`);
			} else {
				let vote;
				if(isNaN(suffix)) {
					const i = channelDocument.poll.options.map(option => {
						return option.toLowerCase();
					}).indexOf(suffix);
					if(i>-1) {
						vote = i;
					}
				} else if(suffix>=0 && suffix<channelDocument.poll.options.length) {
					vote = parseInt(suffix);
				}

				if(vote!=null) {
					channelDocument.poll.responses.push({
						_id: msg.author.id,
						vote
					});
					msg.channel.createMessage(`${msg.author.mention} I cast your vote for **${channelDocument.poll.options[vote]}** 🍻`);
				} else {
					msg.channel.createMessage(`${msg.author.mention} There's no matching option for \`${suffix}\`. 😩 Please use the *number* (starting from 0) of your choice.`);
				}
			}
		} else {
			const results = Polls.getResults(channelDocument.poll);
			const info = [
				`🔮 Ongoing results for the poll **${channelDocument.poll.title}**\n\t${channelDocument.poll.options.map((option, i) => {
					return `${i}) ${option}: ${results.votes[option].count} vote${results.votes[option].count==1 ? "" : "s"} (${results.votes[option].percent}%)`;
				}).join("\n\t")}\nSo far, the winner is...**${results.winner || "tie!"}** out of ${channelDocument.poll.responses.length} vote${channelDocument.poll.responses.length==1 ? "" : "s"} ☑️`,
				`Use \`${bot.getCommandPrefix(msg.guild, serverDocument)}poll <no. of option>\` here or PM me \`poll ${msg.guild.name}|#${msg.channel.name}\` to vote 🗳`
			];
			bot.sendArray(msg.channel, info);
		}
	} else {
		msg.channel.createMessage(`There is no ongoing poll in this channel. 🛡 PM me \`${commandData.name} ${msg.guild.name}|#${msg.channel.name}\` to start one.`);
	}
};