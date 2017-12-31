const { LoggingLevels } = require("../../Internals/Constants");

/**
 * Send message of the day to a server
 * @param bot The bot instance / shard
 * @param server The server
 * @param motdDocument The message_of_the_day document
 */
module.exports = async (bot, server, motdDocument) => {
	if (!motdDocument.last_run) motdDocument.last_run = Date.now();
	const sendMOTD = async serverDocument => {
		const serverConfigDocument = serverDocument.config;
		if (serverConfigDocument.message_of_the_day.isEnabled && serverConfigDocument.message_of_the_day.message_content) {
			const channel = server.channels.get(serverConfigDocument.message_of_the_day.channel_id);
			if (channel) {
				serverConfigDocument.message_of_the_day.last_run = Date.now();
				await serverConfigDocument.message_of_the_day.save().catch(err => {
					winston.warn(`Failed to save message of the day data... 😞\n`, err);
					bot.logMessage(serverDocument, LoggingLevels.ERROR, "Failed to save data for MOTD... Please reconfigure your MOTD! (*-*)", null, channel.id);
				});
				channel.send(serverConfigDocument.message_of_the_day.message_content);
				bot.logMessage(serverDocument, LoggingLevels.INFO, "Sent Message Of The Day successfully.", null, channel.id);
			} else {
				bot.logMessage(serverDocument, LoggingLevels.ERROR, "Couldn't find the channel for MOTD... Please reconfigure your MOTD! (*-*)", null, channel.id);
			}
			bot.setTimeout(async () => {
				const newserverConfigDocument = await Servers.findOne({ _id: server.id }).exec().catch(err => {
					winston.warn(`Failed to set timeout for MOTD... (*-*)\n`, err);
				});
				await sendMOTD(newserverConfigDocument);
			}, serverConfigDocument.message_of_the_day.interval);
		}
	};
	if (motdDocument.isEnabled) {
		if (bot.MOTDTimers.has(server.id)) bot.clearTimeout(bot.MOTDTimers.get(server.id));
		bot.MOTDTimers.set(server.id, bot.setTimeout(async () => {
			const serverDocument = await Servers.findOne({ _id: server.id }).exec().catch(err => {
				winston.warn(`Failed to find server document for MOTD... (*-*)\n`, err);
			});
			await sendMOTD(serverDocument);
		}, Math.abs((new Date(motdDocument.last_run).getTime() + motdDocument.interval) - Date.now())));
	}
};
