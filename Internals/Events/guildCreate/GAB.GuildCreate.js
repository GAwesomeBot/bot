const BaseEvent = require("../BaseEvent.js");
const { NewServer: getNewServerData, PostShardedData } = require("../../../Modules/");
const {	LoggingLevels } = require("../../Constants");

class GuildCreate extends BaseEvent {
	async handle (guild) {
		if (this.configJSON.guildBlocklist.includes(guild.id)) {
			winston.info(`Left "${guild}" due to it being blocklisted!`, { guild: guild.id });
			guild.leave();
		} else {
			this.bot.IPC.send("guilds", { latest: [guild.id], shard: this.bot.shardID });
			this.bot.IPC.send("sendAllGuilds", {});
			await Promise.all([guild.members.fetch(), PostShardedData(this.bot)]);
			let serverDocument, shouldMakeDocument = false;
			try {
				serverDocument = await Servers.findOne({ _id: guild.id }).exec();
			} catch (err) {
				shouldMakeDocument = true;
			}
			if (serverDocument) {
				winston.info(`Rejoined server ${guild}`, { svrid: guild.id });
				this.bot.logMessage(serverDocument, LoggingLevels.INFO, "I've been re-added to your server! (^-^)");
			} else if (shouldMakeDocument || !serverDocument) {
				winston.info(`Joined server ${guild}`, { svrid: guild.id });
				try {
					let newServerDocument = await Servers.create(await getNewServerData(this.bot, guild, new Servers({ _id: guild.id })));
					this.bot.cache.set(newServerDocument._id, newServerDocument);
				} catch (err) {
					winston.warn(`Failed to create a new server document for new server >.>`, { svrid: guild.id }, err);
				}
				this.bot.logMessage(await Servers.findOne({ _id: guild.id }).exec(), LoggingLevels.INFO, "I've been added to your server! (^-^)");
			}
		}
	}
}

module.exports = GuildCreate;
