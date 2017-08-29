/**
 * Send message of the day to a server
 * @param bot The bot instance / shard
 * @param server The server
 * @param motdDocument The message_of_the_day document
 */
module.exports = async (bot, db, server, motdDocument) => {
	if (!motdDocument.last_run) motdDocument.last_run = Date.now();
	const sendMOTD = async serverConfigDocument => {
		if (serverConfigDocument.message_of_the_day.isEnabled && serverConfigDocument.message_of_the_day.message_content) {
			const channel = server.channels.get(serverConfigDocument.message_of_the_day.channel_id);
			if (channel) {
				serverConfigDocument.message_of_the_day.last_run = Date.now();
				await serverConfigDocument.message_of_the_day.save().catch(err => {
					winston.warn(`Failed to save message of the day data... 😞\n`, err);
				});
				channel.send(serverConfigDocument.message_of_the_day.message_content);
			}
			bot.setTimeout(async () => {
				const newserverConfigDocument = await db.servers.findOne({ _id: server.id }).exec().catch(err => {
					winston.warn(`Failed to set timeout for MOTD... (*-*)\n`, err);
				});
				await sendMOTD(newserverConfigDocument);
			}, serverConfigDocument.message_of_the_day.interval);
		}
	};
	if (motdDocument.isEnabled) {
		bot.setTimeout(async () => {
			const serverDocument = await db.servers.findOne({ _id: server.id }).exec().catch(err => {
				winston.warn(`Failed to find server document for MOTD... (*-*)\n`, err);
			});
			await sendMOTD(serverDocument.config);
		}, Math.abs((motdDocument.last_run + motdDocument.interval) - Date.now()));
	}
};
