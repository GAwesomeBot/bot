module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const getRankText = rank => {
		return msg.channel.guild.members.filter(member => {
			const targetMemberDocument = serverDocument.members.id(member.id);
			return targetMemberDocument && targetMemberDocument.rank==rank;
		}).map(member => {
			return `@${bot.getName(msg.channel.guild, serverDocument, member)}`;
		}).sort().join("\n\t");
	};
	if(suffix) {
		const rankDocument = serverDocument.config.ranks_list.id(suffix);
		if(rankDocument) {
			const info = getRankText(rankDocument._id);
			if(info) {
				msg.channel.createMessage(`**🏆 ${rankDocument._id} (${rankDocument.max_score})**\n\t${info}`);
			} else {
				msg.channel.createMessage(`No one on the server has the rank \`${rankDocument._id}\`...yet 🤐`);
			}
		} else if(suffix.toLowerCase() == "me") {
			msg.channel.createMessage(`You have the rank \`${memberDocument.rank}\` 🏆`);
		} else {
			const member = bot.memberSearch(suffix, msg.channel.guild);
			if(member) {
				if(member.user.bot) {
					msg.channel.createMessage("All robots are created equal 🤖😡");
				} else {
					const targetMemberDocument = serverDocument.members.id(member.id);
					if(targetMemberDocument && targetMemberDocument.rank) {
						msg.channel.createMessage(`**@${bot.getName(msg.channel.guild, serverDocument, member)}** has the rank \`${targetMemberDocument.rank}\` 🏆`);
					} else {
						msg.channel.createMessage(`**@${bot.getName(msg.channel.guild, serverDocument, member)}** doesn't have a rank yet`);
					}
				}
				return;
			}

			winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage(`No such rank \`${suffix}\` exists. An admin can create one, though 😛`);
		}
	} else {
		const info = [];
		for(let i = serverDocument.config.ranks_list.length - 1; i >= 0; i--) {
			const rankText = getRankText(serverDocument.config.ranks_list[i]._id);
			if(rankText) {
				info.push(`**🏆 ${serverDocument.config.ranks_list[i]._id} (${serverDocument.config.ranks_list[i].max_score})**\n\t${rankText}`);
			}
		}
		bot.sendArray(msg.channel, info);
	}
};
