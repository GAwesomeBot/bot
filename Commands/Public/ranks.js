module.exports = async ({ bot, Constants: { Colors, Text } }, { serverDocument, channelDocument, memberDocument }, msg, commandData) => {
	const getRankText = (rank, amount = 10) => msg.guild.members.filter(member => {
		const targetMemberDocument = serverDocument.members.id(member.id);
		return targetMemberDocument && targetMemberDocument.rank === rank;
	}).sort((memberA, memberB) => serverDocument.members.id(memberB.id).rank_score - serverDocument.members.id(memberA.id).rank_score)
		.first(amount ? amount : 10)
		.map(member => `@${bot.getName(msg.guild, serverDocument, member)}`)
		.join("\n");
	if (msg.suffix) {
		const rankDocument = serverDocument.config.ranks_list.id(msg.suffix);
		if (rankDocument) {
			const info = getRankText(rankDocument._id);
			if (info) {
				msg.channel.send({
					embed: {
						color: Colors.RESPONSE,
						title: `The top 10 members with rank **${rankDocument._id}** 🏆`,
						description: info,
						footer: {
							text: `You need a rank score of ${rankDocument.max_score} to achieve this rank`,
						},
					},
				});
			} else {
				msg.channel.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `Nobody on **${msg.guild.name}** has the rank \`${rankDocument._id}\` 🤐`,
					},
				});
			}
		} else if (msg.suffix.toLowerCase() === "me") {
			msg.channel.send({
				embed: {
					color: Colors.INFO,
					description: `You have the rank \`${memberDocument.rank}\` 🏅`,
				},
			});
		} else {
			let member;
			try {
				member = await bot.memberSearch(msg.suffix, msg.guild);
			} catch (err) {
				member = false;
			}
			if (member) {
				if (member.user.bot) {
					msg.channel.send({
						embed: {
							color: Colors.SOFT_ERR,
							description: "All robots are created equal 🤖",
						},
					});
				} else {
					const targetMemberDocument = serverDocument.members.id(member.id);
					if (targetMemberDocument && targetMemberDocument.rank) {
						msg.channel.send({
							embed: {
								color: Colors.INFO,
								description: `**@${bot.getName(msg.guild, serverDocument, member)}** has the rank \`${targetMemberDocument.rank}\` 🎖`,
							},
						});
					} else {
						msg.channel.send({
							embed: {
								color: Colors.INFO,
								description: `**@${bot.getName(msg.channel.guild, serverDocument, member)}** doesn't have a rank yet 😟`,
							},
						});
					}
				}
			} else {
				msg.channel.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `Rank \`${msg.suffix}\` does not exist on this guild.`,
						footer: {
							text: "An admin can create one in the Admin Console ⚡",
						},
					},
				});
			}
		}
	} else {
		let noRank = 0;
		const ranks = serverDocument.config.ranks_list
			.sort((a, b) => b.max_score - a.max_score)
			.map(rank => {
				rank.members = 0;
				return rank;
			});
		msg.guild.members.forEach(member => {
			const targetMemberDocument = serverDocument.members.id(member.id);
			if (!targetMemberDocument) return;
			const rankDocument = ranks.find(rank => rank._id === targetMemberDocument.rank);
			if (rankDocument) rankDocument.members++;
			else if (targetMemberDocument.rank === "No Rank") noRank++;
		});
		const fields = ranks.map(rankDocument => ({
			name: rankDocument._id,
			value: `${rankDocument.members} ${rankDocument.members === 1 ? "member needs" : "members need"} ${rankDocument.max_score} points total to rank up.`,
		}));
		msg.channel.send({
			embed: {
				color: Colors.RESPONSE,
				title: `"${msg.guild.name}"'s ranks 🏆`,
				fields,
			},
		});
	}
};
