const { LoggingLevels } = require("../../Internals/Constants");

/**
 * Send message of the day to a server
 * @param client The client instance / shard
 * @param server The server
 * @param motdDocument The message_of_the_day document
 * @param serverQueryDocument
 */
module.exports = async (client, server, motdDocument, serverQueryDocument) => {
	const motdQueryDocument = serverQueryDocument.prop("config.message_of_the_day");

	if (!motdDocument.last_run) motdQueryDocument.set("last_run", Date.now());

	const sendMOTD = async serverDocument => {
		const serverConfigDocument = serverDocument.config;
		const serverConfigQueryDocument = serverDocument.query.prop("config");

		if (serverConfigDocument.message_of_the_day.isEnabled && serverConfigDocument.message_of_the_day.message_content) {
			const channel = server.channels.get(serverConfigDocument.message_of_the_day.channel_id);
			if (channel) {
				serverConfigQueryDocument.set("message_of_the_day.last_run", Date.now());
				await serverDocument.save().catch(err => {
					logger.debug(`Failed to save message of the day data...`, { svrid: server.id, chid: channel.id }, err);
					client.logMessage(serverDocument, LoggingLevels.ERROR, "Failed to save data for MOTD... Please reconfigure your MOTD! (*-*)", channel.id);
				});
				try {
					await channel.send(serverConfigDocument.message_of_the_day.message_content);
					client.logMessage(serverDocument, LoggingLevels.INFO, "Sent Message Of The Day successfully.", channel.id);
				} catch (err) {
					logger.debug(`Failed to send MOTD...`, { svrid: server.id, chid: channel.id }, err);
					client.logMessage(serverDocument, LoggingLevels.ERROR, "Failed to send Message Of The Day!", channel.id);
				}
			} else {
				client.logMessage(serverDocument, LoggingLevels.ERROR, "Couldn't find the channel for MOTD... Please reconfigure your MOTD! (*-*)", null);
			}
			client.setTimeout(async () => {
				const newServerDocument = await Servers.findOne(server.id).catch(err => {
					logger.debug(`Failed to set timeout for MOTD... (*-*)`, { svrid: server.id }, err);
				});
				await sendMOTD(newServerDocument);
			}, serverConfigDocument.message_of_the_day.interval);
		}
	};

	if (motdDocument.isEnabled) {
		if (client.MOTDTimers.has(server.id)) client.clearTimeout(client.MOTDTimers.get(server.id));
		let timeout = (new Date(motdDocument.last_run).getTime() + motdDocument.interval) - Date.now();
		if (timeout <= 0) timeout = 1;
		client.MOTDTimers.set(server.id, client.setTimeout(async () => {
			const serverDocument = await Servers.findOne(server.id).catch(err => {
				logger.debug(`Failed to find server document for MOTD... (*-*)`, { svrid: server.id }, err);
			});
			await sendMOTD(serverDocument);
		}, timeout));
	}
};
