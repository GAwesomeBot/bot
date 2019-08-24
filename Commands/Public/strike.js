const ArgParser = require("../../Modules/MessageUtils/Parser");
const ModLog = require("../../Modules/ModLog");

module.exports = async ({ Constants: { Text, Colors }, client }, { serverDocument, serverQueryDocument }, msg, commandData) => {
	if (msg.suffix) {
		let [member, ...reason] = ArgParser.parseQuoteArgs(msg.suffix, msg.suffix.includes("|") ? "|" : " ");
		member = await client.memberSearch(member.trim(), msg.guild).catch(() => null);
		reason = reason.join(" ").trim();

		if (!member) {
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `I couldn't find a matching member in this guild... 🧐`,
				},
			});
		}
		if (member.user.bot || [msg.author.id, client.user.id].includes(member.id) || client.getUserBotAdmin(msg.guild, serverDocument, member) > 0) {
			return msg.send({
				embed: {
					color: Colors.MISSING_PERMS,
					description: `Sorry, you can't strike **@${client.getName(serverDocument, member)}** ✋`,
					footer: {
						text: msg.author.id === member.user.id ? "You cannot strike yourself!" : "Bots and Bot Admins cannot be striked!",
					},
				},
			});
		}

		let targetMemberQueryDocument = serverQueryDocument.clone.id("members", member.id);
		if (!targetMemberQueryDocument.val) {
			serverQueryDocument.push("members", { _id: member.id });
			targetMemberQueryDocument = serverQueryDocument.clone.id("members", member.id);
		}

		let ModLogID = await ModLog.create(msg.guild, "Strike", member, msg.member, reason);
		if (ModLogID && isNaN(ModLogID) && !["INVALID_MODLOG_CHANNEL", "MISSING_MODLOG_CHANNEL"].includes(ModLogID.code)) throw ModLogID;
		else if (isNaN(ModLogID)) ModLogID = null;

		targetMemberQueryDocument.push("strikes", {
			admin: msg.author.id,
			reason: reason || "No reason specified",
			modlog_entry: ModLogID,
		});

		const strikeLength = targetMemberQueryDocument.val.strikes.length;
		const lastDigit = strikeLength % 10;
		const lastTwoDigits = strikeLength % 100;
		const suffix = lastTwoDigits > 10 && lastTwoDigits < 20 ? "th" :
			lastDigit === 1 ? "st" :
				lastDigit === 2 ? "nd" :
					lastDigit === 3 ? "rd" : "th";
		const strikeAmount = `${strikeLength}${suffix}`;

		let success = true;
		try {
			const DMChannel = await member.user.createDM();
			await DMChannel.send({
				embed: {
					description: `Tsching! You just received your ${strikeAmount} strike! ⚡`,
					fields: [
						{
							name: "Reason",
							value: `${reason || "No reason specified..."}`,
							inline: true,
						},
						{
							name: "Moderator",
							value: `@${msg.author.tag}`,
							inline: true,
						},
					],
					color: Colors.LIGHT_ORANGE,
				},
			});
		} catch (err) {
			success = false;
		}

		msg.send({
			embed: {
				color: Colors.SUCCESS,
				description: `Feel the thunder! **@${client.getName(serverDocument, member)}** has received their ${strikeAmount} strike! 🚦`,
				footer: {
					text: success ? "I also warned them via DM ⚠" : "I tried to warn them via DM, but something went wrong!",
				},
			},
		});
	} else {
		msg.sendInvalidUsage(commandData, "Who do you want me to strike? 😮");
	}
};
