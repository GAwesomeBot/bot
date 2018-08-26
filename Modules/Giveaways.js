/* eslint-disable max-len */
const { Error } = require("../Internals/Errors/");

module.exports = class Giveaways {
	constructor () {
		throw new Error("STATIC_CLASS", this.constructor.name);
	}

	static async start (client, server, serverDocument, user, channel, channelDocument, title, secret, duration) {
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
						text: `Use "${client.getCommandPrefix(server, serverDocument)}giveaway enroll" or "${client.getCommandPrefix(server, serverDocument)}giveaway join" for a chance to win.`,
					},
				},
			});
			client.setTimeout(() => {
				this.end(client, server, channel);
			}, duration);
		}
	}

	static async end (client, server, channel, serverDocument) {
		if (serverDocument) {
			const queryDocument = serverDocument.query.id("channels", channel.id);

			const channelDocument = serverDocument.channels[channel.id];
			if (channelDocument && channelDocument.giveaway.isOngoing) {
				queryDocument.set("giveaway.isOngoing", false);
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
				queryDocument.set("giveaway.participant_ids", []);
				if (winner) {
					channel.send({
						embed: {
							color: 0x00FF00,
							description: `Congratulations **@${client.getName(serverDocument, winner)}**! 🎊`,
							footer: {
								text: `You won the giveaway "${channelDocument.giveaway.title}" out of ${channelDocument.giveaway.participant_ids.length} ${channelDocument.giveaway.participant_ids.length === 1 ? "user!" : "users!"}`,
							},
						},
					});
					winner.send({
						embed: {
							color: 0x00FF00,
							title: "Congratulations! 🎁😁",
							description: `You won the giveaway in #${channel.name} on **${server}**!\n\nHere is your prize: \`\`\`${channelDocument.giveaway.secret}\`\`\``,
						},
					});
				}
				const creator = server.members.get(channelDocument.giveaway.creator_id);
				if (creator) {
					creator.send({
						embed: {
							color: 0x3669FA,
							description: `Your giveaway "${channelDocument.giveaway.title}" running in #${channel.name} on \`${server}\` has ended.\n${winner ? `The winner was **@${client.getName(serverDocument, winner)}**.` : "Nobody won this time 😕"}`,
						},
					});
				}
				return winner;
			}
		}
	}
	static async endTimedGiveaway (client, server, channel, timer) {
		client.setTimeout(async () => {
			const serverDocument = await client.cache.get(server.id);
			await this.end(client, server, channel, serverDocument);
			serverDocument.save();
		}, timer - Date.now());
	}
};
