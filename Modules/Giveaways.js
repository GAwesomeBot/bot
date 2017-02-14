module.exports = {
	start: (bot, db, svr, serverDocument, usr, ch, channelDocument, title, secret, duration) => {
		if(!channelDocument.giveaway.isOngoing) {
			channelDocument.giveaway.isOngoing = true;
			channelDocument.giveaway.expiry_timestamp = Date.now() + duration;
			channelDocument.giveaway.creator_id = usr.id;
			channelDocument.giveaway.title = title;
			channelDocument.giveaway.secret = secret;
			channelDocument.giveaway.participant_ids = [];
			serverDocument.save(() => {
				ch.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						description: `${usr.mention} has started a giveaway: **${title}**! Use \`${bot.getCommandPrefix(svr, serverDocument)}giveaway enroll\` or \`${bot.getCommandPrefix(svr, serverDocument)}giveaway join\` for a chance to win. Good luck! 🍻`
					}
				});
				setTimeout(() => {
					module.exports.end(bot, db, svr, ch);
				}, duration);
			});
		}
	},
	end: (bot, db, svr, ch) => {
        db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
            const channelDocument = serverDocument.channels.id(ch.id);
            if(channelDocument.giveaway.isOngoing) {
                channelDocument.giveaway.isOngoing = false;
                let winner;
                while(!winner && channelDocument.giveaway.participant_ids.length > 0) {
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
                        ch.createMessage({
                            embed: {
                                author: {
                                    name: bot.user.username,
                                    icon_url: bot.user.avatarURL,
                                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                },
                                color: 0x00FF00,
                                description: `Congratulations **@${bot.getName(svr, serverDocument, winner)}**! 🎊 You won the giveaway **${channelDocument.giveaway.title}** out of ${channelDocument.giveaway.participant_ids.length} ${channelDocument.giveaway.participant_ids.length==1 ? "person" : "people"}.`
                            }
                        });
                        winner.user.getDMChannel().then(channel => {
                            channel.createMessage({
                                embed: {
                                    author: {
                                        name: bot.user.username,
                                        icon_url: bot.user.avatarURL,
                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                    },
                                    color: 0x00FF00,
                                    description: `Congratulations! 🎁😁 You won the giveaway in #${ch.name} on ${svr.name}:\`\`\`${channelDocument.giveaway.secret}\`\`\``
                                }
                            });
                        });
                    }
                    const creator = svr.members.get(channelDocument.giveaway.creator_id);
                    if(creator){
                        creator.user.getDMChannel().then(channel => {
                            channel.createMessage({
                                embed: {
                                    author: {
                                        name: bot.user.username,
                                        icon_url: bot.user.avatarURL,
                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                    },
                                    color: 0x00FF00,
                                    description: `Your giveaway "${channelDocument.giveaway.title}" running in <#${ch.id}> has ended.` + `\n${winner ? (`The winner was **@${bot.getName(svr, serverDocument, winner)}**`) : "I couldn't choose a winner for some reason tho 😕"}`
                                }
                            });
                        });
                    }
                });
                return winner;
            }
        });
    }
};
