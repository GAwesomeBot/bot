const { Giveaways } = require("../../Modules/");

module.exports = async ({ client, Constants: { Colors } }, { serverDocument, channelDocument, channelQueryDocument }, msg, commandData) => {
	if (channelDocument.giveaway.isOngoing) {
		if (msg.suffix) {
			if (["enroll", "join"].includes(msg.suffix.toLowerCase().trim())) {
				if (channelDocument.giveaway.creator_id === msg.author.id) {
					msg.reply({
						embed: {
							color: Colors.SOFT_ERR,
							description: `You can't join your own giveaway. 😛`,
						},
					});
				} else if (channelDocument.giveaway.participant_ids.includes(msg.author.id)) {
					msg.send({
						embed: {
							color: Colors.SOFT_ERR,
							description: `You've already enrolled in the giveaway **${channelDocument.giveaway.title}**. 🤪`,
							footer: {
								text: `PM GAwesomeBot (That's me!) "${commandData.name} ${msg.guild.name} | ${msg.channel.name}" to remove your entry.`,
							},
						},
					});
				} else {
					channelQueryDocument.push("giveaway.participant_ids", msg.author.id);
					msg.reply({
						embed: {
							color: Colors.SUCCESS,
							description: `Good luck! May the dolphins of luck be with you 🐬`,
						},
					});
				}
			} else {
				logger.verbose(`Invalid parameters \`${msg.suffix}\` provided for ${commandData.name}`, { usrid: msg.author.id });
				msg.send({
					embed: {
						color: Colors.INVALID,
						description: `🗯 Correct usage is: \`${commandData.name} ${commandData.usage}\``,
					},
				});
			}
		} else {
			const creator = msg.guild.members.get(channelDocument.giveaway.creator_id);
			msg.send({
				embed: {
					color: Colors.INFO,
					title: `${channelDocument.giveaway.title} 🎁	`,
					fields: [{
						name: "Started by",
						value: `@${creator ? client.getName(serverDocument, creator) : "invalid-user"}`,
						inline: true,
					}, {
						name: "Total joined",
						value: `${channelDocument.giveaway.participant_ids.length} ${channelDocument.giveaway.participant_ids.length === 1 ? "person" : "users"} currently`,
						inline: true,
					}],
					footer: {
						text: `Use "${msg.guild.commandPrefix}${commandData.name} enroll" to enroll in this giveaway.`,
					},
				},
			});
		}
	} else {
		msg.send({
			embed: {
				color: Colors.INFO,
				description: "There's isn't a giveaway going on in this channel. 👻",
				footer: {
					text: `PM GAwesomeBot (That's me!) "${commandData.name} ${msg.channel.guild.name} | #${msg.channel.name}" to start one.`,
				},
			},
		});
	}
};
