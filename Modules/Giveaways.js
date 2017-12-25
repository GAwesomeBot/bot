/* eslint-disable max-len */
const { Error } = require("../Internals/Errors/");

module.exports = class Giveaways {
	constructor () {
		throw new Error("STATIC_CLASS", this.constructor.name);
	}

	static async start (bot, server, serverDocument, user, channel, channelDocument, title, secret, duration) {
		if (!channelDocument.giveaway.isOngoing) {
			channelDocument.giveaway.isOngoing = true;
			channelDocument.giveaway.expiry_timestamp = Date.now() + duration;
			channelDocument.giveaway.creator_id = user.id;
			channelDocument.giveaway.title = title;
			channelDocument.giveaway.secret = secret;
			channelDocument.giveaway.participant_ids = [];
			channel.send({
				embed: {
					color: 0x3669FA,
					description: `${user} has started a giveaway called **${title}**! Good luck! 🍻`,
					footer: {
						text: `Use "${bot.getCommandPrefix(server, serverDocument)}giveaway enroll" or "${bot.getCommandPrefix(server, serverDocument)}giveaway join" for a chance to win.`,
					},
				},
			});
			bot.setTimeout(() => {
				this.end(bot, server, channel);
			}, duration);
		}
	}

	static async end (bot, server, channel, serverDoc) {
		const serverDocument = serverDoc || await bot.cache.get(server.id);
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
				if (winner) {
					channel.send({
						embed: {
							color: 0x00FF00,
							description: `Congratulations **@${bot.getName(server, serverDocument, winner)}**! 🎊`,
							footer: {
								text: `You won the giveaway "${channelDocument.giveaway.title}" out of ${channelDocument.giveaway.participant_ids.length} ${channelDocument.giveaway.participant_ids.length === 1 ? "person!" : "users!"}`,
							},
						},
					});
					winner.send({
						embed: {
							color: 0x00FF00,
							title: "Congratulations! 🎁😁",
							description: `You won the giveaway in #${channel.name} on **${server}**!\n\nHere is what you won: \`\`\`${channelDocument.giveaway.secret}\`\`\``,
						},
					});
				}
				const creator = server.members.get(channelDocument.giveaway.creator_id);
				if (creator) {
					creator.send({
						embed: {
							color: 0x3669FA,
							description: `Your giveaway "${channelDocument.giveaway.title}" running in #${channel.name} on \`${server}\` has ended.\n${winner ? `The winner was **@${bot.getName(server, serverDocument, winner)}**.` : "Nobody won this time 😕"}`,
						},
					});
				}
				return winner;
			}
		}
	}
	static async endTimedGiveaway (bot, server, channel, timer) {
		bot.setTimeout(async () => {
			const serverDocument = await bot.cache.get(server.id);
			await this.end(bot, server, channel, serverDocument);
			serverDocument.save();
		}, timer - Date.now());
	}
};
