const moment = require("moment");

// Gets text chat user profile
module.exports = (bot, config, usr, userDocument, titleName) => {
	const firstMember = bot.getFirstMember(usr);
	const mutualServersCount = bot.guilds.filter(svr => {
		return svr.members.has(usr.id);
	}).length;
	const info = [
		`__**Profile for @${titleName}**__`,
		`👤 ${usr.username}#${usr.discriminator}`,
		`🆔 ${usr.id}`,
		`🔵 Status: ${firstMember.status}${firstMember.game ? (`, playing \`${firstMember.game.name}\``) : ""}`,
		`🖼 Avatar: ${usr.avatarURL || usr.defaultAvatarURL}`,
		`🗓 Discord account created ${moment(usr.createdAt).fromNow()}`
	];
	if(!usr.bot && userDocument) {
		info.push(`⭐️ ${userDocument.points} AwesomePoint${userDocument.points==1 ? "" : "s"}`);
	} else {
		info.push("🤖 Is a robot!");
	}
	info.push(`❤️ ${mutualServersCount} mutual server${mutualServersCount==1 ? "" : "s"} with ${bot.user.username}`);
	if(!usr.bot && userDocument) {
		if(firstMember.status!="online" && userDocument.last_seen) {
			info.push(`👀 Last seen: ${moment(userDocument.last_seen).fromNow()}`);
		}
		if(userDocument.profile_fields) {
			for(const key in userDocument.profile_fields) {
				info.push(`ℹ️ ${key}: ${userDocument.profile_fields[key]}`);
			}
		}
		info.push(`🌎 <${config.hosting_url}activity/users?q=${encodeURIComponent(`${usr.username}#${usr.discriminator}`)}>`);
	}
	return info.join("\n");
};
