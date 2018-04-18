const moment = require("moment");

module.exports = async ({ client, Constants: { Colors } }, { serverDocument, memberDocument }, msg, commandData) => {
	if (msg.suffix === "me") {
		return msg.send({
			embed: {
				author: {
					name: client.getName(serverDocument, msg.author),
					iconURL: msg.author.displayAvatarURL({ size: 32 }),
				},
				color: Colors.INFO,
				description: `You sent ${memberDocument.messages} message${memberDocument.messages === 1 ? "" : "s"} this week.`,
			},
		});
	}
	if (msg.suffix) {
		try {
			const member = await client.memberSearch(msg.suffix, msg.guild);
			if (member.user.bot) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: "I do not spy on my fellow robots 🤖",
					},
				});
			}
			const mDoc = serverDocument.members.id(member.id);
			return msg.send({
				embed: {
					author: {
						name: client.getName(serverDocument, member),
						iconURL: member.user.displayAvatarURL({ size: 32 }),
					},
					color: Colors.INFO,
					description: `${client.getName(serverDocument, member)} sent ${mDoc.messages} message${mDoc.messages === 1 ? "" : "s"} this week.`,
				},
			});
		} catch (e) {
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "I could not find any member with that name 😢",
				},
			});
		}
	}

	const sortedMembers = serverDocument.members.filter(m => m.messages).sort((a, b) => b.messages - a.messages);
	const totalMessages = sortedMembers.reduce((a, b) => (a.messages || a) + b.messages, 0);
	const description = sortedMembers
		.slice(0, 8)
		.map(mDoc => {
			const member = msg.guild.members.get(mDoc.id);
			return [
				`» **${client.getName(serverDocument, member)}** «`,
				`\t**${mDoc.messages}** messages`,
			].join("\n");
		});
	if (description.length) {
		msg.send({
			embed: {
				color: Colors.SUCCESS,
				title: `Here ${description.length === 1 ? "is" : "are"} the ${description.length === 1 ? "only member" : `${description.length} members`} who sent the most messages this week!`,
				description: description.join("\n\n"),
				footer: {
					text: `There were ${totalMessages} messages sent by ${sortedMembers.length} member${sortedMembers.length > 1 ? "s" : ""} this week in total!`,
				},
			},
		});
	} else {
		msg.send({
			embed: {
				color: Colors.INFO,
				description: "*This server is literally dead (✖╭╮✖)",
				footer: {
					text: "There were no messages sent this week at all.",
				},
			},
		});
	}
};
