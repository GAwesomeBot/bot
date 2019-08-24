const BaseEvent = require("../BaseEvent.js");
const { NewServer: getNewServerData, PostShardedData } = require("../../../Modules/");
const {	LoggingLevels } = require("../../Constants");

class GuildCreate extends BaseEvent {
	async handle (guild) {
		if (this.configJSON.guildBlocklist.includes(guild.id)) {
			logger.info(`Left "${guild}" due to it being blocklisted!`, { guild: guild.id });
			guild.leave();
		} else {
			this.client.IPC.send("sendAllGuilds", {});
			await Promise.all([guild.members.fetch(), PostShardedData(this.client)]);
			let serverDocument, shouldMakeDocument = false;
			try {
				serverDocument = await Servers.findOne(guild.id);
			} catch (err) {
				shouldMakeDocument = true;
			}
			if (serverDocument) {
				logger.info(`Rejoined server ${guild}`, { svrid: guild.id });
				this.client.logMessage(serverDocument, LoggingLevels.INFO, "I've been re-added to your server! (^-^)");
			} else if (shouldMakeDocument || !serverDocument) {
				logger.info(`Joined server ${guild}`, { svrid: guild.id });
				try {
					const newServerDocument = await getNewServerData(this.client, guild, Servers.new({ _id: guild.id }));
					await newServerDocument.save();
				} catch (err) {
					logger.warn(`Failed to create a new server document for new server >.>`, { svrid: guild.id }, err);
				}
				this.client.logMessage(await Servers.findOne(guild.id), LoggingLevels.INFO, "I've been added to your server! (^-^)");
			}
		}
	}
}

module.exports = GuildCreate;
