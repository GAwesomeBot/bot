/**
 * Set countdown for a server
 * @param bot The bot instance
 * @param {Document} serverDocument The full server document
 * @param {Document} countdownDocument The countdown document
 */
/* eslint-disable require-await*/
module.exports = async (bot, serverDocument, countdownDocument) => {
	const svr = bot.guilds.get(serverDocument._id);
	if (svr) {
		const ch = svr.channels.get(countdownDocument.channel_id);
		if (ch) {
			bot.setTimeout(async () => {
				ch.send({
					embed: {
						color: 0x3669FA,
						description: `3...2...1... **${countdownDocument._id}**`,
					},
				});
				countdownDocument.remove();
				winston.info(`Countdown "${countdownDocument._id}" expired`, { svrid: svr.id, chid: ch.id });
				try {
					await serverDocument.save();
				} catch (err) {
					winston.info("Failed to save server data for countdown expiry", { svrid: svr.id }, err);
				}
			}, countdownDocument.expiry_timestamp - Date.now());
		}
	}
};
