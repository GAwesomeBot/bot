const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		const role = msg.guild.roles.find(a => {
			return a.name==suffix;
		});
		if(role) {
			const color = role.color.toString(16);
			const memberCount = msg.guild.members.filter(member => {
				return member.roles.includes(role.id);
			}).length;
			const info = [
				`__**${role.name}**__`,
				`🆔 ${role.id}`,
				`🎨 Color: #${"000000".substring(0, 6 - color.length)}${color.toUpperCase()}`,
				`🗓 Role created ${moment(role.createdAt).fromNow()}`,
				`👤 ${memberCount} member${memberCount==1 ? " has" : "s have"} this role`,
				`📶 Role #${++role.position}`
			];
			if(role.mentionable) {
				info.push("💟 Mentionable by everyone");
			}
			if(role.hoist) {
				info.push("📌 Hoisted in member list");
			}
			if(role.managed) {
				info.push("🚀 Integrated with a bot or service");
			}
			info.push(`💎 Permissions:\`\`\`${Object.keys(role.permissions.json).sort().join(", ")}\`\`\``);
			msg.channel.createMessage(info.join("\n"));
		} else {
			winston.warn(`Requested role does not exist so ${commandData.name} cannot be shown`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage({
				content: "That role doesn't exist 🚽",
				disableEveryone: true
			});
		}
	} else {
		const memberArray = Array.from(msg.guild.members);
		const info = [];
		Array.from(msg.guild.roles).sort((a, b) => {
			return b[1].position - a[1].position;
		}).slice(0, -1).forEach(role => {
			let name = role[1].name;
			if(role[1].hoist) {
				name = `*${role[1].name}*`;
			}
			const members = memberArray.filter(member => {
				return member[1].roles.includes(role[1].id);
			}).map(member => {
				return `@${bot.getName(msg.guild, serverDocument, member[1])}`;
			});
			if(members.length>0) {
				info.push(`**${name}**\n\t${members.join("\n\t")}`);
			}
		});
		if(info.length>0) {
			bot.sendArray(msg.channel, info, 0, {disableEveryone: true});
		} else {
			msg.channel.createMessage("There are no roles on this server, which is...odd 🙍");
		}
	}
};
