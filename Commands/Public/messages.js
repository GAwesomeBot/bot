/* eslint-disable max-len, arrow-body-style */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (suffix) {
		if (suffix.toLowerCase().trim() === "me") {
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					description: `You've sent ${memberDocument.messages} message${memberDocument.messages === 1 ? "" : "s"} this week! 💬`,
					footer: {
						text: `I wonder if there's a competition anywhere for the "most messages in a week"..`,
					},
				},
			});
		} else {
			const member = bot.memberSearch(suffix.trim().toLowerCase(), msg.channel.guild);
			if (member) {
				if (member.user.bot) {
					msg.channel.createMessage({
						embed: {
							color: 0xFF0000,
							description: `I don't keep tabs on my brethren! 🤖😈`,
						},
					});
				} else {
					let targetMemberDocument = serverDocument.members.id(member.id);
					if (!targetMemberDocument) {
						serverDocument.members.push({ _id: member.id });
						targetMemberDocument = serverDocument.members.id(member.id);
					}
					msg.channel.createMessage({
						embed: {
							color: 0x00FF00,
							description: `**@${bot.getName(msg.channel.guild, serverDocument, member)}** has sent ${targetMemberDocument.messages} message${targetMemberDocument.messages === 1 ? "" : "s"} this week! 💬`,
						},
					});
				}
			} else {
				winston.warn(`Requested member does not exist so ${commandData.name} cannot be shown`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `Who's that? I'd like to meet them. 🤝`,
					},
				});
			}
		}
	} else {
		let _description = [];
		const template = a => {
			const string = `• **@${bot.getName(msg.channel.guild, serverDocument, msg.channel.guild.members.get(a._id))}**\n**»** Sent ${a.messages} message${a.messages === 1 ? "" : "s"} this week`;
			return string;
		};
		serverDocument.members.sort((a, b) => {
			return b.messages - a.messages;
		})
		.filter(a => {
			return msg.channel.guild.members.has(a._id);
		})
		.slice(0, 10)
		.map(a => {
			_description.push(template(a));
		});
		const description = _description.join("\n\n");
		if (description.length) {
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					description: description,
				},
			});
		} else {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `This server is literally dead... (✖╭╮✖)`,
				},
			});
		}
	}
};
