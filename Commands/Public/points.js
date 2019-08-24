module.exports = async ({ Constants: { Colors, Text }, client }, { serverDocument, userDocument }, msg) => {
	if (msg.suffix === "me") {
		msg.send({
			embed: {
				color: Colors.RESPONSE,
				description: `You have **${userDocument.points}** GAwesomePoint${userDocument.points === 1 ? "" : "s"} ⭐`,
			},
		});
	} else if (msg.suffix) {
		const member = await client.memberSearch(msg.suffix, msg.guild).catch(() => null);
		if (member && member.user.bot) {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `Don't be silly, bots can't have GAwesomePoints! 🤖`,
				},
			});
		} else if (member) {
			let targetUserDocument = await Users.findOne(member.id);
			if (!targetUserDocument) targetUserDocument = Users.new({ _id: member.id });
			msg.send({
				embed: {
					color: Colors.RESPONSE,
					description: `**@${client.getName(serverDocument, member)}** has ${targetUserDocument.points} GAwesomePoint${targetUserDocument.points === 1 ? "" : "s"} ⭐`,
				},
			});
		} else {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "Who's that? I'd like to meet them 🤝",
				},
			});
		}
	} else {
		const userDocuments = await Users.find({ _id: { $in: [...msg.guild.members.keys()] }, points: { $gt: 0 } })
			.sort({ points: -1 })
			.limit(10)
			.exec();
		const fields = userDocuments.map(targetUserDocument => ({
			name: `**@${client.getName(serverDocument, msg.guild.members.get(targetUserDocument._id))}:**`,
			value: `${targetUserDocument.points} GAwesomePoint${targetUserDocument.points === 1 ? "" : "s"}`,
			inline: true,
		}));
		if (fields.length) {
			msg.send({
				embed: {
					color: Colors.RESPONSE,
					title: fields.length === 1 ? `Here is the only member with GAwesomePoints 🌟` : `Here are the ${fields.length} members with the most GAwesomePoints 🌟`,
					fields,
				},
			});
		} else {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "No one on this server has any GAwesomePoints! Use `+1` to upvote the previous message 🌠",
				},
			});
		}
	}
};
