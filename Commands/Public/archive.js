module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(!suffix || isNaN(suffix)) {
		winston.warn(`Parameters not provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} I'll need a number of messages to fetch, please 🔢`);
	} else {
		const num = parseInt(suffix);
		const archive = [];
		const doArchive = (count, lastId, callback) => {
			bot.getMessages(msg.channel.id, count, lastId).then(messages => {
				messages.every(msg => {
					if(archive.length < num) {
						archive.push({
							timestamp: msg.timestamp,
							id: msg.id,
							edited: msg.editedTimestamp,
							content: msg.content,
							clean_content: msg.cleanContent,
							attachments: msg.attachments,
							author: {
								username: msg.author.username,
								id: msg.author.id,
								discriminator: msg.author.discriminator,
								bot: msg.author.bot,
								avatar: msg.author.avatar
							}
						});
						return true;
					}
					return false;
				});
				if(archive.length >= num || messages.length < count) {
					callback(null, archive);
				} else {
					const nextCount = num - archive.length;
					doArchive(nextCount >100 ? 100 : nextCount, archive[archive.length-1].id, callback);
				}
			}).catch(callback);
		};
		doArchive(num > 100 ? 100 : num, msg.channel.lastMessageID, (err, archive) => {
			if(err) {
				winston.error(`Failed to archive ${suffix} messages`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
				msg.channel.createMessage("🛑 Discord prevented me from completing this task, are you sure I have message history permisssions?");
			} else {
				msg.channel.createMessage("Here you go! ✅", {
					file: JSON.stringify(archive, null, 4),
					name: `${msg.channel.guild.name}-${msg.channel.name}-${Date.now()}.json`
				}).catch(err => {
					winston.error("Failed to send archive", {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
					msg.channel.createMessage("Discord is getting mad at me. 😓 Try a smaller number of messages.");
				});
			}
		});
	}
};
