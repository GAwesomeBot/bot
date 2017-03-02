module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let member;
	if(!suffix || suffix.toLowerCase()=="me") {
		member = msg.member;
	} else {
		member = bot.memberSearch(suffix, msg.channel.guild);
	}
	if(member) {
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x00FF00,
				title: `Here's the avatar for ` + member.user.username,
                image: {
                    url: member.user.avatarURL || member.user.defaultAvatarURL
                }
			}
		});
	} else {
		winston.warn(`Requested member does not exist so ${commandData.name} cannot be shown`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x9ECDF2,
				description: `I don't know who that is, so you can look at my beautiful face instead 💖\n${bot.user.avatarURL || bot.user.defaultAvatarURL}`
			}
		});
	}
};
