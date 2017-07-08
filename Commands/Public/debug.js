const os = require("os");

/* eslint-disable max-len */
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
	let uptime = Math.round(process.uptime()), uptimeFormatted;
	if (uptime <= 60) {
		uptimeFormatted = `${uptime}s`;
	} else if (uptime <= 3600) {
		uptimeFormatted = `${Math.floor(uptime / 60)}m ${uptime % 60}s`;
	} else if (uptime <= 86400) {
		uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor(uptime % 3600 / 60)}m ${uptime % 3600 % 60}s`;
	} else if (uptime <= 604800) {
		uptimeFormatted = `${Math.floor(uptime / 86400)}w ${Math.floor(uptime % 86400 / 3600)}h ${Math.floor(uptime % 86400 % 3600 / 60)}m ${uptime % 86400 % 3600 % 60}s`;
	}
	embed_fields.push(
		{
			name: `Process Uptime`,
			value: `${uptimeFormatted}`,
			inline: true,
		}
	);
	let maintainers = config.maintainers.map(maintainer => `${bot.users.get(maintainer).username}#${bot.users.get(maintainer).discriminator} ( ${maintainer} )`);
	let shard_users = new Array(bot.shards.size).fill(0), shard_guilds = new Array(bot.shards.size).fill(0), shard_channels = new Array(bot.shards.size).fill(0);
	bot.guilds.forEach(guild => {
		shard_users[guild.shard.id] += guild.members.size;
		shard_channels[guild.shard.id] += guild.channels.size;
		shard_guilds[guild.shard.id] += 1;
	});
	let shard_info = bot.shards.map(shard => `Shard ${shard.id + 1} / ${bot.shards.size} has ${shard_guilds[shard.id]} guild(s), ${shard_channels[shard.id]} channel(s) and ${shard_users[shard.id]} user(s)`);
	const channels = () => {
		let i = 0;
		bot.shards.map(shard => {
			i += shard_channels[shard.id];
		});
		return i;
	};
	const versions = () => {
		const bot_version = config.version || "invalid-version";
		const bot_branch = config.branch || "invalid-branch";
		const api_version = require("eris/package.json").version;
		const node_version = process.versions.node;
		const engine_version = process.versions.v8;
		return `Bot Version: ${bot_version}\nBot Branch: ${bot_branch}\nEris: ${api_version}\nNode.JS: ${node_version}\nNode.JS Engine: ${engine_version}`;
	};
	let s = `
**Bot Name:** \`${bot.user.username}\`
**Bot ID:** \`${bot.user.id}\`
**Bot Discriminator:** \`${bot.user.discriminator}\`
This Guild is on **Shard ${msg.channel.guild.shard.id + 1}**
There are ${bot.shards.size} shard(s), ${bot.guilds.size} guild(s), ${channels()} channel(s) and ${bot.users.size} user(s)\n
**Shard Informations:** \`\`\`css\n${shard_info.join("\n")}\`\`\`
**Bot Maintainers:** \`\`\`css\n${maintainers.join(",\n")}\`\`\`
**Versions:** \`\`\`css\n${versions()}\`\`\`
`;
	msg.channel.createMessage({
		embed: {
			author: {
				name: `Debug Information`,
			},
			color: 0x00FF00,
			description: s,
			fields: suffix.includes("-v") || suffix.includes("verbose") ? embed_fields : [],
			footer: {
				text: `Shard info might result in a different user count than on the webpage!`,
			},
		},
	});
};
