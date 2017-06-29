const ModLog = require("./../../Modules/ModerationLogging.js");

/* eslint-disable max-len */
module.exports = async (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const canKick = member => {
		if (msg.channel.guild.ownerID === msg.author.id) {
			return true;
		}
		let admin = 0;
		msg.member.roles.forEach(roleID => {
			let urole = msg.channel.guild.roles.get(roleID);
			if (urole) {
				if (urole.position > admin) {
					admin = urole.position;
				}
			}
		});
		let target = 0;
		member.roles.forEach(roleID => {
			let urole = msg.channel.guild.roles.get(roleID);
			if (urole) {
				if (urole.position > target) {
					target = urole.position;
				}
			}
		});
		if (admin > target) {
			return true;
		} else {
			return false;
		}
	};
	if (suffix) {
		let member, reason;
		const split = suffix.split("|");
		if (split.length === 2) {
			member = bot.memberSearch(split[0].trim(), msg.channel.guild);
			reason = split[1].trim();
		} else {
			member = bot.memberSearch(suffix.trim(), msg.channel.guild);
			reason = "unspecified reason..";
		}
		if (member) {
			let m = await msg.channel.createMessage({
				embed: {
					color: 0x9ECDF2,
					author: {
						name: `Waiting on @${bot.getName(msg.channel.guild, serverDocument, msg.member)}'s input..'`,
					},
					description: `Are you sure you want to kick **@${bot.getName(msg.channel.guild, serverDocument, member)}**?`,
					footer: {
						text: `They won't lose any strikes that have been issued.`,
					},
				},
			});
			bot.awaitMessage(msg.channel.id, msg.author.id, async message => {
				try {
					message.delete();
				} catch (err) {
					// Ignore Error
				}
				if (config.yes_strings.includes(message.content.trim())) {
					try {
						if (canKick(member)) {
							try {
								const dm = await bot.users.get(member.id).getDMChannel();
								dm.createMessage({
									embed: {
										color: 0xFF0000,
										description: `Oh no, you just got kicked from \`${msg.channel.guild.name}\`!\n`,
										fields: [
											{
												name: `Kicked by`,
												value: `${msg.author.tag}`,
												inline: true,
											},
											{
												name: `Reason`,
												value: `${reason}`,
												inline: true,
											},
										],
										thumbnail: {
											url: `${msg.channel.guild.iconURL}`,
										},
									},
								});
							} catch (err) {
								// Ignore error
							}
							await member.kick(`${reason} | Command issued by @${bot.getName(msg.channel.guild, serverDocument, msg.member)}`).catch(err => {
								throw err;
							});
							m.edit({
								embed: {
									color: 0x00FF00,
									description: `**@${bot.getName(msg.channel.guild, serverDocument, member)}** has been kicked! Bye-bye. 👋`,
								},
							});
							ModLog.create(msg.channel.guild, serverDocument, "Kick", member, msg.member, reason);
						} else {
							m.edit({
								embed: {
									color: 0xFF0000,
									description: `You don't have permission to kick this user...`,
									footer: {
										text: `You should ask someone who is higher than you to run this!`,
									},
								},
							});
						}
					} catch (err) {
						winston.error(`Failed to kick member "${member.user.username}" from the server "${msg.channel.guild.name}"`, { svrid: msg.channel.guild.name, usrid: member.id }, err);
						return m.edit({
							embed: {
								color: 0xFF0000,
								description: `I couldn't kick **@${bot.getName(msg.channel.guild, serverDocument, member)}**! 💥`,
								footer: {
									text: `Either I don't have the "Kick Members" permission, the user was already kicked, or the user isn't in this server!`,
								},
							},
						});
					}
				} else {
					return m.edit({
						embed: {
							color: 0x00FF00,
							description: `Kick canceled! 😓`,
						},
					});
				}
			});
		} else {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `I couldn't find a matching member on this server...`,
					footer: {
						text: `If you have a User ID, you can run "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ID" to ban the user.`,
					},
				},
			});
		}
	} else {
		const m = await msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `Do you want me to kick you? 😮`,
				footer: {
					text: `That means you should mention who you want to kick and give an optional reason...`,
				},
			},
		});
		bot.awaitMessage(msg.channel.id, msg.author.id, message => {
			if (config.yes_strings.includes(message.content.trim())) {
				try {
					message.delete();
				} catch (err) {
					// Ignore Error
				}
				m.edit({
					embed: {
						color: 0xFF0000,
						description: `Ok, see ya!`,
						footer: {
							text: `Its just a prank! Could you say you found an.. Easter Egg...?!`,
						},
					},
				});
			}
		});
	}
};
