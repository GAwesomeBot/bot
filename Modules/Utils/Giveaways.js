/* eslint-disable max-len */
module.exports = class Giveaways {
	constructor() {
		throw new Error(`The ${this.constructor.name} class shouldn't be instantiated!`);
	}

	static async start(bot, db, server, serverDocument, user, channel, channelDocument, title, secret, duration) {
		if (!channelDocument.giveaway.isOngoing) {
			channelDocument.giveaway.isOngoing = true;
			channelDocument.giveaway.expiry_timestamp = Date.now() + duration;
			channelDocument.giveaway.creator_id = user.id;
			channelDocument.giveaway.title = title;
			channelDocument.giveaway.secret = secret;
			channelDocument.giveaway.participant_ids = [];
			try {
				await serverDocument.save();
				channel.send({
					embed: {
						color: 0x3669FA,
						description: `${user} has started a giveaway called **${title}**! Good luck! 🍻`,
						footer: {
							text: `Use "${await bot.getCommandPrefix(server, serverDocument)}giveaway enroll" or "${await bot.getCommandPrefix(server, serverDocument)}giveaway join" for a chance to win.`,
						},
					},
				});
				setTimeout(async () => {
					await this.end(bot, db, server, channel);
				}, duration);
			} catch (err) {
				// Well shit
			}
		}
	}

	static async end(bot, db, server, channel) {
		const serverDocument = await db.findOne({ _id: server.id }).catch(err => {
			winston.warn(`Failed to end giveaway`, err);
		});
		if (serverDocument) {
			const channelDocument = serverDocument.channels.id(channel.id);
			if (channelDocument.giveaway.isOngoing) {
				channelDocument.giveaway.isOngoing = false;
				let winner;
				while (!winner && channelDocument.giveaway.participant_ids.length > 0) {
					const i = Math.floor(Math.random() * channelDocument.giveaway.participant_ids.length);
					const member = server.members.get(channelDocument.giveaway.participant_ids[i]);
					if (member) {
						winner = member;
					} else {
						channelDocument.giveaway.participant_ids.splice(i, 1);
					}
				}
				try {
					await serverDocument.save();
					if (winner) {
						channel.send({
							embed: {
								color: 0x00FF00,
								description: `Congratulations **@${bot.getName(server, serverDocument, winner)}**! 🎊`,
								footer: {
									text: `You won the giveaway "${channelDocument.giveaway.title}" out of ${channelDocument.giveaway.participant_ids.length} ${channelDocument.giveaway.participant_ids.length === 1 ? "person!" : "people!"}`,
								},
							},
						});
						winner.send({
							embed: {
								color: 0x00FF00,
								description: `Congratulations! 🎁😁\nYou won the giveaway in #${channel.name} (${channel}) on \`${server}\`!\nHere is what you won: \`\`\`${channelDocument.giveaway.secret}\`\`\``,
							},
						});
					}
					const creator = server.members.get(channelDocument.giveaway.creator_id);
					if (creator) {
						creator.send({
							embed: {
								color: 0x3669FA,
								description: `Your giveaway "${channelDocument.giveaway.title}" running in #${channel.name} (${channel}) on \`${server}\` has ended.\n${winner ? `The winner was **@${bot.getName(server, serverDocument, winner)}**.` : "I couldn't choose a winner for some reason tho.. 😕"}`,
							},
						});
					}
				} catch (err) {
					// Well shit x 2
				}
				return winner;
			}
		}
	}
	// eslint-disable-next-line require-await
	static async endTimedGiveaway(bot, db, server, channel, timer) {
		setTimeout(async () => {
			await this.end(bot, db, server, channel);
		}, timer - Date.now());
	}
};
