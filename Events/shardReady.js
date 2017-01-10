// A shard receives the ready packet
module.exports = (bot, db, config, winston, id) => {
	winston.info(`Shard ${id + 1}/${config.shard_count || 1} connected: ${bot.guilds.size} guilds`);
};
