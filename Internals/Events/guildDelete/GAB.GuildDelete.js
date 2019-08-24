const BaseEvent = require("../BaseEvent");
const { PostShardedData } = require("../../../Modules/");

class GuildDelete extends BaseEvent {
	async handle (guild) {
		this.client.IPC.send("sendAllGuilds");
		await PostShardedData(this.client);
		logger.info(`Left server ${guild} :(`, { svrid: guild.id });
	}
}

module.exports = GuildDelete;
