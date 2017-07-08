/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (!suffix || isNaN(suffix)) {
		winston.warn(`Parameters not provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `I'll need a number of messages to fetch, please! 🔢`,
				footer: {
					text: `FYI: The max amount of messages I can get is 100! Shocking!`,
				},
			},
		});
	} else {
		const num = parseInt(suffix);
		const archive = [];
		const doArchive = (count, lastId, callback) => {
			bot.getMessages(msg.channel.id, count, lastId).then(messages => {
				messages.every(message => {
					if (archive.length < num) {
						archive.push({
							timestamp: message.timestamp,
							id: message.id,
							edited: message.editedTimestamp,
							content: message.content,
							clean_content: message.cleanContent,
							attachments: message.attachments,
							author: {
								username: message.author.username,
								id: message.author.id,
								discriminator: message.author.discriminator,
								bot: message.author.bot,
								avatar: message.author.avatar,
							},
							embed: message.embeds,
						});
						return true;
					}
					return false;
				});
				if (archive.length >= num || messages.length < count) {
					return callback(null, archive);
				} else {
					const nextCount = num - archive.length;
					doArchive(nextCount > 100 ? 100 : nextCount, archive[archive.length - 1].id, callback);
				}
			}).catch(callback);
		};
		doArchive(num > 100 ? 100 : num, msg.channel.lastMessageID, (err, archiveRes) => {
			if (err) {
				winston.error(`Failed to archive ${suffix} messages`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id }, err);
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: "Discord prevented me from completing this task! 🛑",
						footer: {
							text: "Are you sure I have read message history permisssions?",
						},
					},
				});
			} else {
				msg.channel.createMessage({
					embed: {
						color: 0x00FF00,
						description: "Here you go! ✅",
					},
				}, {
					file: JSON.stringify(archiveRes, null, 4),
					name: `${msg.channel.guild.name}-${msg.channel.name}-${Date.now()}.json`,
				}).catch(discordErr => {
					winston.error("Failed to send archive", { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id }, discordErr);
					msg.channel.createMessage({
						embed: {
							color: 0xFF0000,
							description: `Discord is getting mad at me. 😓`,
							footer: {
								text: `Try a smaller number of messages! I'm probably going over the 8MB limit..`,
							},
						},
					});
				});
			}
		});
	}
};
