const ModLog = require("./../../Modules/ModerationLogging.js");

/* eslint-disable max-len */
module.exports = async (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if (suffix) {
		let member, reason;
		const split = suffix.split("|");
		if (split.length === 2) {
			member = bot.memberSearch(split[0].trim(), msg.channel.guild);
			reason = split[1].trim();
		} else {
			member = bot.memberSearch(suffix, msg.channel.guild);
			reason = "unspecified reason..";
		}
		if (member) {
			if (bot.isMuted(msg.channel, member)) {
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `**@${bot.getName(msg.channel.guild, serverDocument, member)}** is already muted, so I can't mute them again! 🤓`,
						footer: {
							text: `You can unmute them by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}unmute".`,
						},
					},
				});
			} else {
				bot.muteMember(msg.channel, member, err => {
					if (err) {
						winston.error(`Failed to mute member "${member.user.username}" in channel "${msg.channel.name}" from server "${msg.channel.guild.name}"`, { svrid: msg.channel.guild.name, usrid: member.user.id }, err);
						msg.channel.createMessage({
							embed: {
								color: 0xFF0000,
								description: `I couldn't mute **@${bot.getName(msg.channel.guild, serverDocument, member)}** in this channel.. 😴 *Thanks Discord*`,
								footer: {
									text: `Make sure I have permission to edit this channels permission settings!`,
								},
							},
						});
					} else {
						msg.channel.createMessage({
							embed: {
								color: 0x00FF00,
								description: `**@${bot.getName(msg.channel.guild, serverDocument, member)}** can't speak in #${msg.channel.name} anymore 🔇`,
							},
						});
						ModLog.create(msg.channel.guild, serverDocument, "Mute", member, msg.member, reason);
					}
				});
			}
		} else {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `I couldn't find a matching member on this server..`,
				},
			});
		}
	} else {
		const m = await msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `Do you want me to mute you? 😮`,
				footer: {
					text: `That means you should mention who you want to mute and give an optional reason...`,
				},
			},
		});
		bot.awaitMessage(msg.channel.id, msg.author.id, async message => {
			if (config.yes_strings.includes(message.content.trim())) {
				try {
					await message.delete();
				} catch (err) {
					// Ignore error
				}
				m.edit({
					embed: {
						color: 0xFF0000,
						description: `Ok! You've been muted!`,
						footer: {
							text: `Its just a prank bro! I guess you could say.. you found an Easter Egg...`,
						},
					},
				});
			}
		});
	}
};
