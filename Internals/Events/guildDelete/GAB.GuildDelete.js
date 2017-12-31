const BaseEvent = require("../BaseEvent");
const { PostShardedData } = require("../../../Modules/");

class GuildDelete extends BaseEvent {
	async handle (guild) {
		this.bot.IPC.send("guilds", { remove: [guild.id], shard: this.bot.shardID });
		this.bot.IPC.send("sendAllGuilds");
		await PostShardedData(this.bot);
		winston.info(`Left server ${guild} :(`, { svrid: guild.id });
	}
}

module.exports = GuildDelete;
