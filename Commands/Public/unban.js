const { create: CreateModLog } = require("../../Modules/ModLog");
const ArgParser = require("../../Modules/MessageUtils/Parser");

const userFilter = query => ({ user }) => {
	if (query.startsWith("<@") && query.endsWith(">")) {
		query = query.slice(2, -1);
	}

	return user.id === query || user.tag === query || user.username === query;
};

module.exports = async ({ client, Constants: { Colors, Text }, configJS }, { serverDocument }, msg, commandData) => {
	if (msg.suffix) {
		const bans = await msg.guild.fetchBans();
		let query, reason;
		if (msg.suffix.includes("|")) [query, reason] = ArgParser.parseQuoteArgs(msg.suffix, "|");
		else query = msg.suffix;
		if (!reason) reason = "Unspecified reason...";

		if (!msg.guild.me.permissions.has("BAN_MEMBERS")) {
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					title: `I'm sorry, but I can't do that... 😔`,
					description: `I'm missing permissions to ban that user!`,
				},
			});
		}

		const ban = bans.find(userFilter(query.trim()));
		if (ban && ban.user) {
			await msg.send({
				embed: {
					color: Colors.INPUT,
					title: `Waiting on @__${client.getName(serverDocument, msg.member)}__'s input..`,
					description: `Are you sure you want to unban **@${ban.user.tag}**?\n\nThey were banned for\`\`\`css\n${ban.reason}\`\`\`\nThey will be unbanned for\`\`\`css\n${reason.trim()}\`\`\``,
					footer: {
						text: `The unbanned user will not be automatically notified!`,
					},
				},
			});
			const response = (await msg.channel.awaitMessages(message => message.author.id === msg.author.id, { max: 1, time: 120000 })).first();
			if (response) response.delete().catch();
			if (response && configJS.yesStrings.includes(response.content.toLowerCase().trim())) {
				await msg.guild.members.unban(ban.user, `${reason} | Command issued by ${msg.author.tag}`);
				await CreateModLog(msg.guild, "Unban", ban.user, msg.member, reason.trim());
				msg.send({
					embed: {
						color: Colors.SUCCESS,
						description: `You've successfully given **@${ban.user.tag}** a second chance 😇`,
					},
				});
			} else {
				msg.send({
					embed: {
						color: Colors.INFO,
						description: "They're not getting back in! 😈",
					},
				});
			}
		} else {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "I couldn't find a matching user that's banned on this guild!",
					footer: {
						text: isNaN(query) || query.length !== 18 ? "Try unbanning by ID instead." : "",
					},
				},
			});
		}
	} else {
		msg.sendInvalidUsage(commandData, "Huh? Unban what?");
	}
};
