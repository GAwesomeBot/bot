/**
 * Set countdown for a server
 * @param client The client instance
 * @param {Document} serverDocument The full server document
 * @param {Document} countdownDocument The countdown document
 */
/* eslint-disable require-await*/
module.exports = async (client, serverDocument, countdownDocument) => {
	const svr = client.guilds.get(serverDocument._id);
	if (svr) {
		const ch = svr.channels.get(countdownDocument.channel_id);
		if (ch) {
			client.setTimeout(async () => {
				ch.send({
					embed: {
						color: 0x3669FA,
						description: `3...2...1... **${countdownDocument._id}**`,
					},
				});
				winston.info(`Countdown "${countdownDocument._id}" expired`, { svrid: svr.id, chid: ch.id });
				try {
					let newServerDoc = await client.cache.get(serverDocument._id);
					let newCountdownDoc = newServerDoc.config.countdown_data.id(countdownDocument._id);
					if (newCountdownDoc) newCountdownDoc.remove();
					await newServerDoc.save();
				} catch (err) {
					winston.info("Failed to save server data for countdown expiry", { svrid: svr.id }, err);
				}
			}, countdownDocument.expiry_timestamp - Date.now());
		}
	}
};
