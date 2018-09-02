const BaseEvent = require("../BaseEvent.js");
const { NewServer: getNewServerData, PostShardedData } = require("../../../Modules/");
const {	LoggingLevels } = require("../../Constants");

class GuildCreate extends BaseEvent {
	async handle (guild) {
		if (this.configJSON.guildBlocklist.includes(guild.id)) {
			winston.info(`Left "${guild}" due to it being blocklisted!`, { guild: guild.id });
			guild.leave();
		} else {
			this.client.IPC.send("sendAllGuilds", {});
			await Promise.all([guild.members.fetch(), PostShardedData(this.client)]);
			let serverDocument, shouldMakeDocument = false;
			try {
				serverDocument = await EServers.findOne(guild.id);
			} catch (err) {
				shouldMakeDocument = true;
			}
			if (serverDocument) {
				winston.info(`Rejoined server ${guild}`, { svrid: guild.id });
				this.client.logMessage(serverDocument, LoggingLevels.INFO, "I've been re-added to your server! (^-^)");
			} else if (shouldMakeDocument || !serverDocument) {
				winston.info(`Joined server ${guild}`, { svrid: guild.id });
				try {
					const newServerDocument = await getNewServerData(this.client, guild, EServers.new(guild.id));
					await newServerDocument.save();
				} catch (err) {
					winston.warn(`Failed to create a new server document for new server >.>`, { svrid: guild.id }, err);
				}
				this.client.logMessage(await EServers.findOne(guild.id), LoggingLevels.INFO, "I've been added to your server! (^-^)");
			}
		}
	}
}

module.exports = GuildCreate;
