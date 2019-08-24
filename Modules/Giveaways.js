/* eslint-disable max-len */
const { Error } = require("../Internals/Errors/");

module.exports = class Giveaways {
	constructor () {
		throw new Error("STATIC_CLASS", {}, this.constructor.name);
	}

	static async start (client, server, serverDocument, user, channel, channelDocument, title, secret, duration) {
		const serverQueryDocument = serverDocument.query;
		const giveawayQueryDocument = serverQueryDocument.clone.id("channels", channelDocument._id).prop("giveaway");

		if (!channelDocument.giveaway.isOngoing) {
			giveawayQueryDocument.set("isOngoing", true)
				.set("expiry_timestamp", Date.now() + duration)
				.set("creator_id", user.id)
				.set("title", title)
				.set("secret", secret)
				.set("participant_ids", []);
			channel.send({
				embed: {
					color: 0x3669FA,
					description: `${user} has started a giveaway called **${title}**! Good luck! 🍻`,
					footer: {
						text: `Use "${client.getCommandPrefix(server, serverDocument)}giveaway enroll" or "${client.getCommandPrefix(server, serverDocument)}giveaway join" for a chance to win.`,
					},
				},
			}).catch(err => {
				logger.debug(`Failed to send Giveaway message to channel.`, { svrid: server.id, chid: channel.id }, err);
			});
			client.setTimeout(async () => {
				this.end(client, server, channel, await Servers.findOne(serverDocument._id));
			}, duration);
		}
	}

	static async end (client, server, channel, serverDocument) {
		if (serverDocument) {
			const channelQueryDocument = serverDocument.query.id("channels", channel.id);

			const channelDocument = serverDocument.channels[channel.id];
			if (channelDocument && channelDocument.giveaway.isOngoing) {
				channelQueryDocument.set("giveaway.isOngoing", false);
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
				channelQueryDocument.set("giveaway.participant_ids", []);
				if (winner) {
					channel.send({
						embed: {
							color: 0x00FF00,
							description: `Congratulations **@${client.getName(serverDocument, winner)}**! 🎊`,
							footer: {
								text: `You won the giveaway "${channelDocument.giveaway.title}" out of ${channelDocument.giveaway.participant_ids.length} ${channelDocument.giveaway.participant_ids.length === 1 ? "user!" : "users!"}`,
							},
						},
					}).catch(err => {
						logger.debug(`Failed to send Giveaway message to channel.`, { svrid: server.id, chid: channel.id }, err);
					});
					winner.send({
						embed: {
							color: 0x00FF00,
							title: "Congratulations! 🎁😁",
							description: `You won the giveaway in #${channel.name} on **${server}**!\n\nHere is your prize: \`\`\`${channelDocument.giveaway.secret}\`\`\``,
						},
					}).catch(err => {
						logger.debug(`Failed to send Giveaway message to DM.`, { svrid: server.id, usrid: winner.id }, err);
					});
				}
				const creator = server.members.get(channelDocument.giveaway.creator_id);
				if (creator) {
					creator.send({
						embed: {
							color: 0x3669FA,
							description: `Your giveaway "${channelDocument.giveaway.title}" running in #${channel.name} on \`${server}\` has ended.\n${winner ? `The winner was **@${client.getName(serverDocument, winner)}**.` : "Nobody won this time 😕"}`,
						},
					}).catch(err => {
						logger.debug(`Failed to send Giveaway message to DM.`, { svrid: server.id, usrid: creator.id }, err);
					});
				}
				return winner;
			}
		}
	}

	static async endTimedGiveaway (client, server, channel, timer) {
		client.setTimeout(async () => {
			const serverDocument = await Servers.findOne(server.id);
			await this.end(client, server, channel, serverDocument);
			serverDocument.save();
		}, timer - Date.now());
	}
};
