const Polls = require("./../../Modules/Polls.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(channelDocument.poll.isOngoing) {
		if(suffix) {
			const voteDocument = channelDocument.poll.responses.id(msg.author.id);
			if(voteDocument) {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						description: `You've already voted in this poll. PM me \`${commandData.name} ${msg.channel.guild.name}|#${msg.channel.name}\` to erase your vote.`
					}
				});
			} else {
				let vote;
				if(isNaN(suffix)) {
					const i = channelDocument.poll.options.map(option => {
						return option.toLowerCase();
					}).indexOf(suffix);
					if(i > -1) {
						vote = i;
					}
				} else if(suffix >= 0 && suffix < channelDocument.poll.options.length) {
					vote = parseInt(suffix);
				}
				if(vote != null) {
					channelDocument.poll.responses.push({
						_id: msg.author.id,
						vote
					});
					msg.channel.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0x00FF00,
							description: `I cast your vote for **${channelDocument.poll.options[vote]}** 🍻`
						}
					});
				} else {
					msg.channel.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0xFF0000,
							description: `There's no matching option for \`${suffix}\`. 😩 Please use the *number* (starting from 0) of your choice.`
						}
					});
				}
			}
		} else {
			const results = Polls.getResults(channelDocument.poll);
			let embed_fields = [];
			channelDocument.poll.options.map((option, i) => {
				embed_fields.push({
					name: `${i}) ${option}:`,
					value: `${results.votes[option].count} vote${results.votes[option].count == 1 ? "" : "s"} (${results.votes[option].percent}%)`,
					inline: true
				});
			});
			msg.channel.createMessage({
                embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
                    description: `🔮 Ongoing results for the poll **${channelDocument.poll.title}**\n\tSo far, the winner is...**${results.winner || "tie!"}** out of ${channelDocument.poll.responses.length} vote${channelDocument.poll.responses.length == 1 ? "" : "s"} ☑ \nUse \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}poll <no. of option>\` here or PM me \`poll ${msg.channel.guild.name}|#${msg.channel.name}\` to vote 🗳`,
					fields: embed_fields
				}
			});
		}
	} else {
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0xFF0000,
				description: `There is no ongoing poll in this channel. 🛡 PM me \`${commandData.name} ${msg.channel.guild.name}|#${msg.channel.name}\` to start one.`
			}
		});
	}
};