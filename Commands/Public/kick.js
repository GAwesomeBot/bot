const { create: CreateModLog } = require("../../Modules/ModLog");
const ArgParser = require("../../Modules/MessageUtils/Parser");

module.exports = async ({ client, Constants: { Colors, Text }, configJS }, { serverDocument }, msg, commandData) => {
	if (msg.suffix) {
		let [memberQuery, ...reason] = ArgParser.parseQuoteArgs(msg.suffix, msg.suffix.includes("|") ? "|" : " ");
		if (reason && reason.length) reason = reason.join(" ");
		else reason = "Unspecified reason...";

		const member = await client.memberSearch(memberQuery.trim(), msg.guild).catch(() => null);
		if (!member) {
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `I couldn't find a matching member in this guild... 🧐`,
				},
			});
		}

		const { canClientKick, memberAboveAffected } = client.canDoActionOnMember(msg.guild, msg.member, member || null, "kick");
		if (!canClientKick) {
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					title: `I'm sorry, but I can't do that... 😔`,
					description: `I'm missing permissions to kick that user!\nEither they are above me or I don't have the **Kick Members** permission.`,
				},
			});
		}
		if (!memberAboveAffected) {
			return msg.send({
				embed: {
					color: Colors.MISSING_PERMS,
					title: `I'm sorry, but I cannot let you do that! 😶`,
					description: `You cannot kick someone who's above you! That's dumb!`,
				},
			});
		}

		const kicked = () => msg.send({
			embed: {
				color: Colors.SUCCESS,
				description: `Bye-Bye **@${client.getName(serverDocument, member)}** 👞`,
			},
		});
		const dmKicked = id => client.users.get(id).send({
			embed: {
				color: Colors.RED,
				description: `Youch! You just got kicked from \`${msg.guild}\`! 👞`,
				fields: [
					{
						name: `Reason`,
						value: `${reason}`,
						inline: true,
					},
					{
						name: `Moderator`,
						value: `@${msg.author.tag}`,
						inline: true,
					},
				],
				thumbnail: {
					url: msg.guild.iconURL(),
				},
			},
		}).catch(() => null);

		await msg.send({
			embed: {
				color: Colors.INPUT,
				title: `Waiting on @__${client.getName(serverDocument, msg.member)}__'s input...`,
				description: `Are you sure you want to kick **@${client.getName(serverDocument, member)} (${member})**?\n\nThey will be kicked for\`\`\`css\n${reason}\`\`\``,
				footer: {
					text: `They will be notified, and can join the server again with an invite.`,
				},
			},
		});
		const response = (await msg.channel.awaitMessages(res => res.author.id === msg.author.id, { max: 1, time: 60000 })).first();
		response.delete().catch();
		if (response && response.content && configJS.yesStrings.includes(response.content.toLowerCase().trim())) {
			await dmKicked(member.id);
			await member.kick(`${reason} | Command issued by @${msg.author.tag}`);
			await CreateModLog(msg.guild, "Kick", member, msg.author, reason);
			return kicked();
		} else {
			msg.send({
				embed: {
					description: `Phew! Kick canceled 😓`,
					color: Colors.INFO,
				},
			});
		}
	} else {
		msg.sendInvalidUsage(commandData, "Do you want me to kick you? 😮");
		const response = (await msg.channel.awaitMessages(res => res.author.id === msg.author.id, { max: 1, time: 60000 })).first();
		if (response && response.content && configJS.yesStrings.includes(response.content.toLowerCase().trim())) {
			response.delete().catch();
			msg.send({
				embed: {
					color: Colors.LIGHT_RED,
					description: `Ok! Bye-Bye!`,
					footer: {
						text: `Just kidding! I'd never kick you. ❤️`,
					},
				},
			});
		}
	}
};
