const os = require("os");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	let embed_fields = [
		{
			name: `System Info`,
			value: `${process.platform}-${process.arch} with ${process.release.name} version ${process.version.slice(1)}`,
			inline: true,
		},
		{
			name: `Process PID`,
			value: `${process.pid}`,
			inline: true,
		},
		{
			name: `Process Memory Usage`,
			value: `${Math.ceil(process.memoryUsage().heapTotal / 1000000)}MB`,
			inline: true,
		},
		{
			name: `System Memory Report`,
			value: `${Math.ceil((os.totalmem() - os.freemem()) / 1000000)}MB used of ${Math.ceil(os.totalmem() / 1000000)}MB`,
			inline: true,
		},
	];
	//eslint-disable-next-line
	let maintainers = config.maintainers.map(maintainer => {
		return `${bot.users.get(maintainer).username}#${bot.users.get(maintainer).discriminator} ( ${maintainer} )`;
	});
	let shard_users = new Array(bot.shards.size).fill(0), shard_guilds = new Array(bot.shards.size).fill(0);
	bot.guilds.forEach(guild => {
		shard_users[guild.shard.id] += guild.members.size;
		shard_guilds[guild.shard.id] += 1;
	});
	//eslint-disable-next-line
	let shard_info = bot.shards.map(shard => {
		return `Shard ${shard.id + 1} / ${bot.shards.size} has ${shard_guilds[shard.id]} guilds and ${shard_users[shard.id]} users`;
	});
	let s = `
	Bot Version: \`${config.version}\`\n
	Bot Name: \`${bot.user.username}\`\n
	Bot ID: \`${bot.user.id}\`\n
	Bot Discriminator: \`${bot.user.discriminator}\`\n
	This guild is on shard \`${msg.channel.guild.shard.id + 1}\`\n
	The bot has \`${bot.shards.size}\` shards\n
	The bot knows \`${bot.users.size}\` users and \`${bot.guilds.size}\` guilds\n
	Shard Informations: \`\`\`css\n${shard_info.join("\n")}\`\`\`
	Bot Maintainers: \`\`\`css\n${maintainers.join(",\n")}\`\`\`
	`;
	let uptime = Math.round(process.uptime()), uptimeFormatted;
	if (uptime <= 60) {
		uptimeFormatted = `${uptime}s`;
	} else if (uptime <= 3600) {
		uptimeFormatted = `${Math.floor(uptime / 60)}m ${uptime % 60}s`;
	} else if (uptime <= 86400) {
		uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor(uptime % 3600 / 60)}m ${uptime % 3600 % 60}s`;
	} else if (uptime <= 604800) { //eslint-disable-next-line
		uptimeFormatted = `${Math.floor(uptime / 86400)}w ${Math.floor(uptime % 86400 / 3600)}h ${Math.floor(uptime % 86400 % 3600 / 60)}m ${uptime % 86400 % 3600 % 60}s`;
	}
	embed_fields.push(
		{
			name: `Process Uptime`,
			value: `${uptimeFormatted}`,
			inline: true,
		}
	);
	msg.channel.createMessage({
		embed: {
			author: {
				name: `${bot.user.username} Debug Information`,
			},
			color: 0x00FF00,
			description: s,
			fields: suffix.includes("-v") || suffix.includes("verbose") ? embed_fields : [],
			footer: { //eslint-disable-next-line
				text: `Shard info might result in a different user count than on the webpage!`,
			},
		},
	});
};
