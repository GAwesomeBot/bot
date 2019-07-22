const multipliers = {
	1: "Small Size 💸",
	2: "Standard Size 💵",
	5: "Big Size 💰",
	10: "Huge Size 💳",
	100: "Massive Size 🤑",
};

const { Lotteries } = require("../../Modules/");
const moment = require("moment");

module.exports = async ({ client, Constants: { Colors, Text, EmptySpace } }, { serverDocument, channelDocument, channelQueryDocument, userDocument, userQueryDocument }, msg, commandData) => {
	const notOngoing = () => {
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: "There isn't a **GAwesomePoint** lottery going on right now.",
				footer: {
					text: `Use "${msg.guild.commandPrefix}${commandData.name} start" to start one.`,
				},
			},
		});
	};
	if (msg.suffix) {
		switch (msg.suffix.toLowerCase().trim()) {
			case "start": {
				if (channelDocument.lottery.isOngoing) {
					const participantTotal = channelDocument.lottery.participant_ids.filter((ticket, index, array) => index === array.indexOf(ticket)).length;
					msg.send({
						embed: {
							color: Colors.SOFT_ERR,
							title: "There's already a lottery going on in this channel 🕰",
							description: `It currently has ${participantTotal} ${participantTotal === 1 ? "person" : "users"} with their eyes on the prize! 👀`,
							footer: {
								text: `You must wait for the current lottery to end before you can start a new one.`,
							},
						},
					});
				} else {
					await msg.channel.send({
						embed: {
							color: Colors.PROMPT,
							title: "What size should this lottery have? 💲",
							fields: [
								{
									name: "Small 💸",
									value: "1x multiplier",
									inline: true,
								},
								{
									name: "Standard 💵",
									value: "2x multiplier",
									inline: true,
								},
								{
									name: "Big 💰",
									value: "5x multiplier",
									inline: true,
								},
								{
									name: "Huge 💳",
									value: "10x multiplier",
									inline: true,
								},
								{
									name: "Massive 🤑",
									value: "100x multiplier",
									inline: true,
								},
							],
							footer: {
								text: "Multipliers count for ticket prices and the prize, you have 2 minutes to respond. The default is standard.",
							},
						},
					});

					let response = (await msg.channel.awaitMessages(res => res.author.id === msg.author.id, {
						max: 1,
						time: 120000,
					})).first();

					if (response && !["massive", "100", "huge", "10", "big", "5", "standard", "2", "small", "1", "massive 🤑", "huge 💳", "big 💰", "standard 💵", "small 💸"].includes(response.content.toLowerCase().trim())) {
						response.channel.send({
							embed: {
								color: Colors.INVALID,
								description: "That isn't a valid lottery size... 😲",
								footer: {
									text: `We will use the default of 2x instead!`,
								},
							},
						});
					}
					if (!response) response = "2";
					else response = response.content;

					let multiplier;
					switch (response.toLowerCase().trim()) {
						case "massive":
						case "100":
						case "massive 🤑":
							multiplier = 100;
							break;
						case "huge":
						case "10":
						case "huge 💳":
							multiplier = 10;
							break;
						case "big":
						case "5":
						case "big 💰":
							multiplier = 5;
							break;
						case "small":
						case "1":
						case "small 💸":
							multiplier = 1;
							break;
						default:
							multiplier = 2;
					}
					if (userDocument.points < multiplier && (userDocument.points !== 0 || multiplier !== 1)) {
						return msg.channel.send({
							embed: {
								color: Colors.SOFT_ERR,
								description: "You aren't rich enough to start this lottery... 🍸",
								footer: {
									text: "Try a smaller sized lottery instead",
								},
							},
						});
					}
					Lotteries.start(client, msg.guild, serverDocument, msg.author, msg.channel, channelDocument, multiplier);
					msg.send({
						embed: {
							color: Colors.SUCCESS,
							title: "GAwesomePoint lottery started! 🌟",
							description: `Anyone can use \`${msg.guild.commandPrefix}${commandData.name} enroll\` or \`${msg.guild.commandPrefix}${commandData.name} join\` for a chance to win! 🤑`,
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
					const participantTotal = channelDocument.lottery.participant_ids.filter((ticket, index, array) => index === array.indexOf(ticket)).length || 1;
					const ticketPrice = Math.floor(participantTotal * channelDocument.lottery.multiplier);
					if (userDocument.points >= ticketPrice) {
						const userTicketCount = channelDocument.lottery.participant_ids.reduce((total, ticket) => total + (ticket === msg.author.id), 0);
						if (userTicketCount === 5) {
							msg.send({
								embed: {
									color: Colors.SOFT_ERR,
									description: "You can't buy more than 5 lottery tickets in the same lottery. 🎩",
								},
							});
						} else {
							userQueryDocument.inc("points", -ticketPrice);
							channelQueryDocument.push("lottery.participant_ids", msg.author.id);
							msg.send({
								embed: {
									color: Colors.SUCCESS,
									title: "Thank you for purchasing a GAwesomePoint lottery ticket 🎟",
									description: `That cost you ${ticketPrice} point${ticketPrice === 1 ? "" : "s"} - the winner will be announced ${moment(channelDocument.lottery.expiry_timestamp).fromNow()}.`,
									footer: {
										text: `You now have ${userTicketCount + 1} ticket${userTicketCount === 0 ? "" : "s"}. No refunds.`,
									},
								},
							});
						}
					} else {
						msg.send({
							embed: {
								color: Colors.SOFT_ERR,
								title: "You're not rich enough to buy a ticket! 😔",
								description: `You need at least ${ticketPrice} point${ticketPrice === 1 ? "" : "s"}`,
								footer: {
									text: `You only have ${userDocument.points} GAwesomePoint${userDocument.points === 1 ? "" : "s"}`,
								},
							},
						});
					}
				} else {
					notOngoing();
				}
				break;
			}
			case "end":
			case ".": {
				if (channelDocument.lottery.isOngoing) {
					if (channelDocument.lottery.creator_id === msg.author.id || client.getUserBotAdmin(msg.guild, serverDocument, msg.member) >= 1 || configJSON.maintainers.includes(msg.author.id)) {
						const winner = await Lotteries.end(client, msg.guild, serverDocument, msg.channel, channelDocument);
						if (!winner) {
							msg.send({
								embed: {
									color: Colors.SOFT_ERR,
									description: "The lottery ended with no winner 😥",
								},
							});
						}
					} else {
						msg.send({
							embed: {
								color: Colors.MISSING_PERMS,
								description: Text.MISSING_PERMS(),
							},
						});
					}
				} else {
					notOngoing();
				}
				break;
			}
			default: {
				logger.silly(`Invalid parameters "${msg.suffix}" provided for ${commandData.name}`, { usrid: msg.author.id, svrid: msg.guild.id, chid: msg.channel.id });
				msg.sendInvalidUsage(commandData);
				break;
			}
		}
	} else if (channelDocument.lottery.isOngoing) {
		const creator = msg.guild.members.get(channelDocument.lottery.creator_id);
		const participantTotal = channelDocument.lottery.participant_ids.filter((ticket, index, array) => index === array.indexOf(ticket)).length;
		const ticketPrice = Math.floor(participantTotal * channelDocument.lottery.multiplier);
		const { multiplier } = channelDocument.lottery;
		const prize = Math.ceil(channelDocument.lottery.participant_ids.length * channelDocument.lottery.multiplier);
		msg.send({
			embed: {
				color: Colors.INFO,
				title: `GAwesomePoint lottery started by "@__${creator ? client.getName(serverDocument, creator) : "invalid-user"}__" 💸`,
				fields: [
					{
						name: "Current Ticket Price",
						value: `${ticketPrice} **GAwesomePoint${ticketPrice === 1 ? "" : "s"}**`,
						inline: true,
					},
					{
						name: `${multipliers[multiplier] ? multipliers[multiplier] : "Unknown Size"}`,
						value: `${multiplier}x multiplier`,
						inline: true,
					},
					{
						name: `Current Prize`,
						value: `${prize} **GAwesomePoint${prize === 1 ? "" : "s"}**`,
						inline: true,
					},
					{
						name: `${EmptySpace}`,
						value: `${EmptySpace}`,
						inline: true,
					},
					{
						name: "Ticket holders",
						value: `${participantTotal} ${participantTotal === 1 ? "person" : "users"}`,
						inline: true,
					},
					{
						name: `${EmptySpace}`,
						value: `${EmptySpace}`,
						inline: true,
					},
				],
				footer: {
					text: `The winner will be announced ${moment(channelDocument.lottery.expiry_timestamp).fromNow()}`,
				},
			},
		});
	} else {
		notOngoing();
	}
};
