const { create: CreateModLog } = require("../../Modules/ModLog");
const ArgParser = require("../../Modules/MessageUtils/Parser");
const ModLog = require("../../Modules/ModLog.js");

module.exports = async ({ Constants: { Colors, Text }, client }, { serverDocument }, msg, commandData) => {
	if (msg.suffix) {
		let [memberQuery, ...reason] = ArgParser.parseQuoteArgs(msg.suffix, msg.suffix.includes("|") ? "|" : " ");
		if (!memberQuery) return msg.sendInvalidUsage(commandData);
		memberQuery = memberQuery.trim();
		reason = reason ? reason.join(" ").trim() : "No reason specified...";

		const member = await client.memberSearch(memberQuery, msg.guild).catch(() => null);
		if (member) {
			const { canClientMute, memberAboveAffected } = client.canDoActionOnMember(msg.guild, msg.member, member, "mute");
			if (!canClientMute) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: `I'm sorry, but I can't do that... 😔`,
						description: `I'm missing permissions to mute that user!\nEither they are above me or I don't have the **Manage Roles** permission.`,
					},
				});
			}
			if (!memberAboveAffected) {
				return msg.send({
					embed: {
						color: Colors.MISSING_PERMS,
						title: `I'm sorry, but I cannot let you do that! 😶`,
						description: `You cannot mute someone who's above you! That's dumb!`,
					},
				});
			}

			if (client.isMuted(msg.channel, member)) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: "That member is already muted. You can't double-mute members, that's crazy talk! 🤪",
					},
				});
			}

			await client.muteMember(msg.channel, member, `Muted ${member.user.tag} in #${msg.channel.name} | Command issued by ${msg.author.tag}`);
			await ModLog.create(msg.guild, "Mute", member, msg.author, reason);
			msg.send({
				embed: {
					color: Colors.SUCCESS,
					description: `**@${client.getName(serverDocument, member)}** can't speak in #${msg.channel.name} anymore 🔇`,
				},
			});
		} else {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `I couldn't find a matching member in this guild... 🧐`,
				},
			});
		}
	} else {
		msg.sendInvalidUsage(commandData, "Do you want me to mute you? 😮");
	}
};
