const moment = require("moment");

// Gets text chat user profile
module.exports = (bot, config, usr, userDocument, titleName) => {
	const firstMember = bot.getFirstMember(usr);
	const mutualServersCount = bot.guilds.filter(svr => {
		return svr.members.has(usr.id);
	}).length;
	let embed_fields = [
	{
		name: "Name 👤",
		value: `${usr.username}`,
		inline: true
	},
	{
		name: "#⃣",
		value: `${usr.discriminator}`,
		inline: true
	},
	{
		name: "🆔",
		value: `${usr.id}`,
		inline: true
	},
	{
		name: "Status",
		value: `${firstMember.status}${firstMember.game ? (`, playing **\`${firstMember.game.name}\`**`) : ""}`,
		inline: true
	},
	{
		name: "Created",
		value: `${moment(usr.createdAt).fromNow()}`,
		inline: true
	}];
	if(!usr.bot && userDocument) {
		embed_fields.push({
			name: `AwesomePoints`,
			value: `⭐️ ${userDocument.points} AwesomePoint${userDocument.points==1 ? "" : "s"}`,
			inline: true
		});
	} else {
		embed_fields.push({
			name: "🤖",
			value: "User is a robot!",
			inline: true
		});
	}
	embed_fields.push({
		name: "Mutual Servers",
		value: `❤️ ${mutualServersCount} mutual server${mutualServersCount==1 ? "" : "s"} with ${bot.user.username}`,
		inline: true
	});
	if(!usr.bot && userDocument) {
		if(firstMember.status!= "online" && userDocument.last_seen) {
			embed_fields.push({
				name: "👀 Last seen:",
				value: `${moment(userDocument.last_seen).fromNow()}`,
				inline: true
			});
		}
		if (userDocument.profile_fields) {
			for(const key in userDocument.profile_fields) {
				embed_fields.push({
					name: `ℹ️ ${key}:`,
					value: `${userDocument.profile_fields[key]}`,
					inline: true
				});
			}
		}
	}
	embed_fields.push({
		name: "🌎 Public Link",
		value: `Click [here](${config.hosting_url}activity/users?q=${encodeURIComponent(`${usr.username}#${usr.discriminator}`)})`,
		inline: true
	});
	const embed = {
		color: 0x9ECDF2,
		author: {
			name: bot.user.username,
			icon_url: bot.user.avatarURL,
			url: "https://github.com/GilbertGobbels/GAwesomeBot"
		},
		fields: embed_fields,
		footer: {
			text: `${usr.username}'s avatar!`,
			icon_url: `${usr.avatarURL || usr.defaultAvatarURL}`
		}
	};
	return embed;
};
