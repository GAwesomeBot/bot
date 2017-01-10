module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(channelDocument.giveaway.isOngoing) {
		if(suffix) {
			if(suffix.toLowerCase()=="enroll") {
				if(channelDocument.giveaway.creator_id==msg.author.id) {
					msg.channel.createMessage(`${msg.author.mention} Uh, you can't join your own giveaway. That would kinda defeat the purpose, wouldn't it? 😛`);
				} else {
					if(channelDocument.giveaway.participant_ids.indexOf(msg.author.id)>-1) {
						msg.channel.createMessage(`You're already enrolled in the giveaway **${channelDocument.giveaway.title}** in this channel. Would you like to disenroll?`).then(() => {
							bot.awaitMessage(msg.channel.id, msg.author.id, message => {
								if(config.yes_strings.indexOf(message.content.toLowerCase().trim())>-1) {
									channelDocument.giveaway.participant_ids.splice(channelDocument.giveaway.participant_ids.indexOf(msg.author.id), 1);
									msg.channel.createMessage(`Ok, ${msg.author.mention} now has 0 chance of winning 🐿`);
								}
							});
						});
					} else {
						channelDocument.giveaway.participant_ids.push(msg.author.id);
						msg.channel.createMessage(`Alright ${msg.author.mention}! Here's a dolphin to wish you good luck: 🐬`);
					}
				}
			} else {
				winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage(`${msg.author.mention} huh? this command only takes \`enroll\` as a parameter`);
			}
		} else {
			const creator = msg.guild.members.get(channelDocument.giveaway.creator_id);
			msg.channel.createMessage(`**${channelDocument.giveaway.title}** 🍰\nStarted by @${creator ? bot.getName(msg.guild, serverDocument, creator) : "invalid-user"}\t${channelDocument.giveaway.participant_ids.length} ${channelDocument.giveaway.participant_ids.length==1 ? "person" : "people"} enrolled currently`);
		}
	} else {
		msg.channel.createMessage(`There's isn't a giveaway going on in this channel. 👻 PM me \`${commandData.name} ${msg.guild.name}|#${msg.channel.name}\` to start one.`);
	}
};