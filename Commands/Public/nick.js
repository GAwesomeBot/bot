const ArgParser = require("../../Modules/MessageUtils/Parser");

module.exports = async ({ Constants: { Colors, Text }, client }, { serverDocument }, msg, commandData) => {
	if (msg.suffix) {
		let [target, nickname] = ArgParser.parseQuoteArgs(msg.suffix, "|");
		if (target && nickname) {
			if (!msg.member.hasPermission("MANAGE_NICKNAMES")) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `You don't have permission to edit other member's nicks on this server 🔨`,
					},
				});
			}

			if (!target.trim() || !nickname.trim()) {
				winston.silly(`Invalid parameters \`${msg.suffix}\` provided for ${commandData.name}`, { usrid: msg.author.id });
				return msg.send({
					embed: {
						color: Colors.INVALID,
						description: Text.INVALID_USAGE(commandData, msg.guild.commandPrefix),
					},
				});
			}

			let member;
			try {
				member = await client.memberSearch(target.trim(), msg.guild);
			} catch (err) {
				// No-op
			}
			if (!member) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `I don't know who ${target.trim()} is! 😦`,
					},
				});
			}

			const { canClientManage, memberAboveAffected } = client.canDoActionOnMember(msg.guild, msg.member, member, "manage");

			if (!canClientManage) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: `I'm sorry, but I can't do that... 😔`,
						description: `I'm missing permissions to manage that user!\nEither they are above me or I don't have the **Manage Nicknames** permission.`,
					},
				});
			}
			if (!memberAboveAffected) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: `I'm sorry, but I cannot let you do that! 😶`,
						description: `You cannot manage someone who's above you! That's dumb!`,
					},
				});
			}
			if (nickname.length > 32) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: `I'm sorry, but you can't do that... 😔`,
						description: "Your nickname must not contain more than 32 characters!",
					},
				});
			}

			if (nickname.trim() === ".") nickname = "";
			await member.edit({ nick: nickname }, `Command issued by ${msg.author.tag}`);
			msg.send({
				embed: {
					color: Colors.SUCCESS,
					description: `${client.getName(serverDocument, member, true)} now has ${nickname === "" ? "no nickname" : `the nickname \`${member.nickname}\``} on this guild 💥`,
				},
			});
		} else if (target) {
			nickname = target;
			if (nickname === ".") nickname = "";

			if (!msg.member.manageable) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: `I'm sorry, but I can't do that... 😔`,
						description: `I'm missing permissions to manage you!\nEither you are above me or I don't have the **Manage Nicknames** permission.`,
					},
				});
			}
			if (nickname.length > 32) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: `I'm sorry, but you can't do that... 😔`,
						description: "Your nickname must not contain more than 32 characters!",
					},
				});
			}

			await msg.member.edit({ nick: nickname }, `Command issued by ${msg.author.tag}`);
			msg.send({
				color: Colors.SUCCESS,
				description: `You now have the nickname \`${msg.member.nickname}\` on this server 💥`,
			});
		}
	} else if (msg.member.nickname) {
		msg.send({
			embed: {
				color: Colors.RESPONSE,
				description: `🏷 Your nick on this guild is \`${msg.member.nickname}\``,
			},
		});
	} else {
		msg.send({
			embed: {
				color: Colors.RESPONSE,
				description: `You don't have a nick on this server. Use \`${msg.guild.commandPrefix}${commandData.name} <name>\` to set one`,
			},
		});
	}
};
