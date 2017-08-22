/**
 * Send message of the day to a server
 * @param bot The bot instance / shard
 * @param server The server
 * @param motdDocument The message_of_the_day document
 */
module.exports = async (bot, db, server, motdDocument) => {
	const sendMOTD = async serverDocument => {
		if (serverDocument.message_of_the_day.isEnabled && serverDocument.message_of_the_day.message_content) {
			const channel = server.channels.get(serverDocument.message_of_the_day.channel_id);
			if (channel) {
				serverDocument.message_of_the_day.last_run = Date.now();
				await serverDocument.message_of_the_day.save().catch(err => {
					winston.warn(`Failed to save message of the day data.. 😞\n`, err);
				});
				channel.send(serverDocument.message_of_the_day.message_content);
			}
			bot.setTimeout(async () => {
				const newServerDocument = await db.servers.findOne({ _id: server.id }).exec().catch(err => {
					winston.warn(`Failed to set timeout for MOTD.. x(\n`, err);
				});
				await sendMOTD(newServerDocument);
			}, serverDocument.message_of_the_day.interval);
		}
	};
	if (motdDocument.isEnabled) {
		bot.setTimeout(async () => {
			const serverDocument = await db.servers.findOne({ _id: server.id }).exec().catch(err => {
				winston.info(`Failed to find server document for motd..\n`, err);
			});
			await sendMOTD(serverDocument);
		}, (motdDocument.last_run + motdDocument.interval) - Date.now());
	}
};
