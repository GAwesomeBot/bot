/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let member;
	if (!suffix || suffix.toLowerCase() === "me") {
		member = msg.member;
	} else {
		member = bot.memberSearch(suffix, msg.channel.guild);
	}
	if (member) {
		let avatar_url = member.user.avatarURL ? member.user.avatarURL.replace("?size=128", "?size=1024") : member.user.defaultAvatarURL;
		msg.channel.createMessage({
			embed: {
				author: {
					name: `${member.user.username}'s Avatar`,
					icon_url: `${avatar_url}`,
				},
				color: 0x00FF00,
				image: {
					url: avatar_url,
				},
			},
		});
	} else {
		winston.warn(`Requested member does not exist so ${commandData.name} cannot be shown`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `I don't know who that is, so you can look at my beautiful face instead 💖`,
				image: {
					url: `${bot.user.avatarURL.replace("?size=128", "?size=1024") || bot.user.defaultAvatarURL}`,
				},
			},
		});
	}
};
