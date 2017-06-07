/* eslint-disable max-len */
module.exports = async (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (channelDocument.giveaway.isOngoing) {
		if (suffix && ["enroll", "join"].includes(suffix.toLowerCase())) {
			if (channelDocument.giveaway.creator_id === msg.author.id) {
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `Uh, you can't join your own giveaway. That would kinda defeat the purpose, wouldn't it? 😛`,
					},
				});
			} else if (channelDocument.giveaway.participant_ids.includes(msg.author.id)) {
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `You've already joined in the giveaway **${channelDocument.giveaway.title}** in this channel.`,
						footer: {
							text: `If you want to leave this giveaway, run "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} leave"`,
						},
					},
				});
			} else {
				channelDocument.giveaway.participant_ids.push(msg.author.id);
				msg.channel.createMessage({
					embed: {
						color: 0x00FF00,
						description: `Alright, you're in! Here's a dolphin to wish you good luck: 🐬`,
					},
				});
			}
		} else if (suffix && suffix.toLowerCase() === "leave" && channelDocument.giveaway.participant_ids.includes(msg.author.id)) {
			const m = await msg.channel.createMessage({
				embed: {
					color: 0x9ECDF2,
					description: `Are you sure you want to leave the giveaway called **${channelDocument.giveaway.title}**, that's happening in this channel?`,
					footer: {
						text: `You'll be able to re-join this giveaway by running "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} enroll or join" in this channel!`,
					},
				},
			});
			bot.awaitMessage(msg.channel.id, msg.author.id, message => {
				try {
					message.delete();
				} catch (err) {
					// Ignore error
				}
				if (config.yes_strings.includes(message.content.toLowerCase().trim())) {
					if (channelDocument.giveaway.participant_ids.length === 1) {
						delete channelDocument.giveaway.participant_ids[0];
					} else {
						channelDocument.giveaway.participant_ids.splice(channelDocument.giveaway.participant_ids.indexOf(msg.author.id), 1);
					}
					m.edit({
						embed: {
							color: 0x00FF00,
							description: `Ok, you now have 0 chance of winning! 🐿`,
							footer: {
								text: `You can join back by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} enroll or join"`,
							},
						},
					});
				} else {
					m.edit({
						embed: {
							color: 0x9ECDF2,
							description: `Ok, you still have a chance of winning! Good Luck!`,
						},
					});
				}
			});
		} else if (suffix && suffix.toLowerCase() === "leave" && !channelDocument.giveaway.participant_ids.includes(msg.author.id)) {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `You cannot leave a giveaway if you never joined it!`,
					footer: {
						text: `You can join the giveaway by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} enroll or join"`,
					},
				},
			});
		} else if (suffix && !["enroll", "join", "leave"].includes(suffix.toLowerCase())) {
			winston.warn(`Invalid parameters "${suffix}" provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `Huh? This command only takes \`enroll\`, \`join\` or \`leave\` as a parameter!`,
					footer: {
						text: `If you want to leave the giveaway, run "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} leave", and you'll be asked if you want to leave.`,
					},
				},
			});
		} else {
			const creator = msg.channel.guild.members.get(channelDocument.giveaway.creator_id);
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					title: `${channelDocument.giveaway.title} 🍰`,
					footer: {
						text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} enroll or join" to join this giveaway! We wish you luck!`,
					},
					author: {
						name: `Started by @${creator ? bot.getName(msg.channel.guild, serverDocument, creator) : "invalid-user"}`,
						icon_url: creator ? creator.user.avatarURL : "https://discordapp.com/assets/0e291f67c9274a1abdddeb3fd919cbaa.png",
					},
					description: `${channelDocument.giveaway.participant_ids.length} ${channelDocument.giveaway.participant_ids.length === 1 ? "person" : "people"} joined currently`,
				},
			});
		}
	} else {
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `There isn't a giveaway going on in this channel. 👻`,
				footer: {
					text: `PM me "${commandData.name} ${msg.channel.guild.name}|#${msg.channel.name}" to start one.`,
				},
			},
		});
	}
};
