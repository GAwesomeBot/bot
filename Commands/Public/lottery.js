const Lotteries = require("./../../Modules/Lotteries.js");
const moment = require("moment");

/* eslint-disable max-len, arrow-body-style */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const showNotStarted = () => msg.channel.createMessage({
		embed: {
			color: 0xFF0000,
			description: `There isn't a GAwesomePoints lottery going on right now.`,
			footer: {
				text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} start" to start one.`,
			},
		},
	});
	if (suffix) {
		switch (suffix.toLowerCase().trim()) {
		case "start": {
			if (channelDocument.lottery.isOngoing) {
				const participantCount = channelDocument.lottery.participant_ids.filter((elem, i, self) => {
					return i === self.indexOf(elem);
				}).length;
				msg.channel.createMessage({
					embed: {
						color: 0x9ECDF2,
						description: `There's already a lottery going on in this channel, with ${participantCount} ${participantCount === 1 ? "person" : "people"} currently in. 👍`,
						footer: {
							text: `Wait for it to end before starting a new one.`,
						},
					},
				});
			} else {
				Lotteries.start(db, msg.channel.guild, serverDocument, msg.author, msg.channel, channelDocument);
				msg.channel.createMessage({
					embed: {
						color: 0x00FF00,
						description: `GAwesomePoints lottery started! 🌟\nAnyone can use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} enroll\` or \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} join\` for a chance to win! 🤑`,
						footer: {
							text: `The winner will be announced ${moment(channelDocument.lottery.expiry_timestamp).fromNow()}`,
						},
					},
				});
			}
			break;
		}
		case "join":
		case "enroll": {
			if (channelDocument.lottery.isOngoing) {
				const ticketPrice = Math.floor(channelDocument.lottery.participant_ids.length * Lotteries.multiplier);
				if (userDocument.points >= ticketPrice) {
					const userTicketCount = channelDocument.lottery.participant_ids.reduce((n, usrid) => {
						return n + (usrid === msg.author.id);
					}, 0);
					if (userTicketCount >= 5) {
						msg.channel.createMessage({
							embed: {
								color: 0xFF0000,
								description: `You can't buy more than 5 tickets, that would be rude to the other lottery attendants`,
							},
						});
					} else {
						userDocument.points -= ticketPrice;
						userDocument.save(userDocErr => {
							if (userDocErr) {
								winston.error("Failed to save user data for lottery ticket purchase", { usrid: msg.author.id }, userDocErr);
							}
							channelDocument.lottery.participant_ids.push(msg.author.id);
							serverDocument.save(serverDocErr => {
								if (serverDocErr) {
									winston.error("Failed to save server data for points lottery", { svrid: msg.channel.guild.id }, serverDocErr);
								}
								msg.channel.createMessage({
									embed: {
										color: 0x00FF00,
										description: `Thank you for purchasing a GAwesomePoints™ lottery ticket! 🎟\nThe winner will be announced ${moment(channelDocument.lottery.expiry_timestamp).fromNow()}.`,
										footer: {
											text: `That costed you ${ticketPrice} point${ticketPrice === 1 ? "" : "s"} - no refunds.`,
										},
									},
								});
							});
						});
					}
				} else {
					msg.channel.createMessage({
						embed: {
							color: 0xFF0000,
							description: `Sorry, but you don't have enough points to participate in the 1%-only lottery... 😔`,
						},
					});
				}
			} else {
				showNotStarted();
			}
			break;
		}
		case "end":
		case ".": {
			if (channelDocument.lottery.isOngoing) {
				if (channelDocument.lottery.creator_id === msg.author.id || bot.getUserBotAdmin(msg.channel.guild, serverDocument, msg.member) >= 1) {
					const winner = Lotteries.end(db, msg.channel.guild, serverDocument, msg.channel, channelDocument);
					if (!winner) {
						msg.channel.createMessage({
							embed: {
								color: 0xFF0000,
								description: `The lottery ended but no one won..`,
							},
						});
					}
				}
			} else {
				showNotStarted();
			}
			break;
		}
		default: {
			winston.warn(`Invalid parameter "${suffix}" provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `What? What did you want? 😱`,
					footer: {
						text: `The syntax for this command is "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}".`,
					},
				},
			});
		}
		}
	} else if (channelDocument.lottery.isOngoing) {
		const creator = msg.channel.guild.members.get(channelDocument.lottery.creator_id);
		const participantCount = channelDocument.lottery.participant_ids.filter((elem, i, self) => {
			return i === self.indexOf(elem);
		}).length;
		msg.channel.createMessage({
			embed: {
				color: 0x00FF00,
				author: {
					name: `Theres a GAwesomePoints lottery started by ${creator ? `<@${creator.id}>` : "invalid-user"}`,
					icon_url: creator ? bot.users.get(creator.id).avatarURL : "https://discordapp.com/assets/6debd47ed13483642cf09e832ed0bc1b.png",
				},
				description: `There are ${participantCount} ${participantCount === 1 ? "person" : "people"} currently in. 💸`,
				footer: {
					text: `The winner will be announced ${moment(channelDocument.lottery.expiry_timestamp).fromNow()}.`,
				},
			},
		});
	} else {
		showNotStarted();
	}
};
