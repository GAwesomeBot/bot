const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		const role = msg.channel.guild.roles.find(a => {
			return a.name == suffix;
		});
		if(role) {
			const color = role.color.toString(16);
			const memberCount = msg.channel.guild.members.filter(member => {
				return member.roles.includes(role.id);
			}).length;
			let embed_fields = [
				{
					name: `__**Role name**__`,
					value: `${role.name}`,
					inline: true
				},
				{
					name: "🆔",
					value: `${role.id}`,
					inline: true
				},
				{
					name: "🎨 Color",
					value: `#${"000000".substring(0, 6 - color.length)}${color.toUpperCase()}`,
					inline: true
				},
				{
					name: "🗓 Role created",
					value: `${moment(role.createdAt).fromNow()}`,
					inline: true
				},
				{
					name: "👤",
					value: `${memberCount} member${memberCount==1 ? " has" : "s have"} this role`,
					inline: true
				},
				{
					name: "📶 Role",
					value: `#${++role.position}`,
					inline: true
				}
			];
			if(role.mentionable) {
				embed_fields.push({
					name: "💟",
					value: "Mentionable by everyone",
					inline: true
				});
			}
			if(role.hoist) {
				embed_fields.push({
					name: "📌",
					value: "Hoisted in member list",
					inline: true
				});
			}
			if(role.managed) {
				embed_fields.push({
					name: "🚀",
					value: "Integrated with a bot or service",
					inline: true
				});
			}
			embed_fields.push({
				name: "💎 Permissions",
				value: `\`\`\`${Object.keys(role.permissions.json).sort().join(", ")}\`\`\``,
				inline: false
			});
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x9ECDF2,
					fields: embed_fields
				}
			});
		} else {
			winston.warn(`Requested role does not exist so ${commandData.name} cannot be shown`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage({
				content: "That role doesn't exist 🚽",
			});
		}
	} else {
		const memberArray = Array.from(msg.channel.guild.members);
		const info = [];
		Array.from(msg.channel.guild.roles).sort((a, b) => {
			return b[1].position - a[1].position;
		}).slice(0, -1).forEach(role => {
			let name = role[1].name;
			if(role[1].hoist) {
				name = `*${role[1].name}*`;
			}
			const members = memberArray.filter(member => {
				return member[1].roles.includes(role[1].id);
			}).map(member => {
				return `@${bot.getName(msg.channel.guild, serverDocument, member[1])}`;
			});
			if(members.length>0) {
				info.push(`**${name}**\n\t${members.join("\n\t")}`);
			}
		});
		if(info.length > 0) {
			bot.sendArray(msg.channel, info, 0, {disableEveryone: true});
		} else {
			msg.channel.createMessage("There are no roles on this server, which is...odd 🙍");
		}
	}
};
