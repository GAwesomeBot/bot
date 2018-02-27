const BaseEvent = require("../BaseEvent");
const { PostShardedData } = require("../../../Modules/");

class GuildDelete extends BaseEvent {
	async handle (guild) {
		this.client.IPC.send("guilds", { remove: [guild.id], shard: this.client.shardID });
		this.client.IPC.send("sendAllGuilds");
		await PostShardedData(this.client);
		winston.info(`Left server ${guild} :(`, { svrid: guild.id });
	}
}

module.exports = GuildDelete;
