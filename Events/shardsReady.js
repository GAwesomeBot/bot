// All shards are ready
module.exports = (bot, db, config, winston) => {
	winston.info(`Shards: ${config.shard_count}`);
	let users = new Array(bot.shards.size).fill(0), guilds = new Array(bot.shards.size).fill(0);
	bot.guilds.forEach(guild => {
		users[guild.shard.id] += guild.members.size;
		guilds[guild.shard.id] += 1;
	});
	bot.shards.forEach(shard => {
		winston.info(`Shard ${shard.id + 1}/${config.shard_count || 1} connected: ${guilds[shard.id]} guilds, ${users[shard.id]} users`);
	});
	winston.info("All shards connected");
};
