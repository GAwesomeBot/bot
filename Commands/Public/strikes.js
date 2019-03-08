const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");
const moment = require("moment");

module.exports = async ({ Constants: { Colors, Text }, client }, { serverDocument, serverQueryDocument }, msg, commandData) => {
	let member;
	// eslint-disable-next-line prefer-destructuring
	if (!msg.suffix || msg.suffix === "me") member = msg.member;
	else member = await client.memberSearch(msg.suffix, msg.guild).catch(() => null);
	if (!member) {
		return msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: `I couldn't find a matching member in this guild... 🧐`,
			},
		});
	}

	let targetMemberDocument = serverDocument.members[member.id];
	if (!targetMemberDocument) {
		serverQueryDocument.push("members", { _id: member.id });
		targetMemberDocument = serverDocument.members[member.id];
	}

	const fields = targetMemberDocument.strikes.map(strikeDocument => {
		const admin = msg.guild.members.get(strikeDocument.admin);
		return [{
			name: "❓ Reason",
			value: strikeDocument.reason,
		}, {
			name: "👮 Moderator",
			value: `**@${client.getName(serverDocument, admin)}**`,
			inline: true,
		}, {
			name: "📆 Date",
			value: moment(strikeDocument.timestamp).fromNow(),
			inline: true,
		}, {
			name: "📄 ModLog Entry",
			value: strikeDocument.modlog_entry === null ? "None" : strikeDocument.modlog_entry,
			inline: true,
		}];
	});

	if (fields.length === 0) {
		msg.send({
			embed: {
				color: Colors.RESPONSE,
				description: `**${msg.author.id === member.user.id ? "You** don't" : `@${client.getName(serverDocument, member)}** doesn't`} have any strikes ✅`,
			},
		});
	} else {
		const menu = new PaginatedEmbed(msg, {
			title: `Showing strikes for member **@${client.getName(serverDocument, member)}**`,
			description: `Strike {currentPage} out of {totalPages}`,
			color: Colors.RESPONSE,
		}, {
			fields: fields.reverse(),
			pageCount: fields.length,
		});
		await menu.init();
	}
};
