// Set countdown for a server
module.exports = (bot, winston, serverDocument, countdownDocument) => {
	setTimeout(() => {
		const svr = bot.guilds.get(serverDocument._id);
		if(svr) {
			const ch = svr.channels.get(countdownDocument.channel_id);
			if(ch) {
				ch.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						description: `3...2...1...**${countdownDocument._id}**`
					}
				});
				countdownDocument.remove();
				winston.info(`Countdown '${countdownDocument._id}' expired`, {svrid: svr.id, chid: ch.id});
				serverDocument.save(err => {
					if(err) {
						winston.info("Failed to save server data for countdown expiry", {svrid: svr.id}, err);
					}
				});
			}
		}
	}, countdownDocument.expiry_timestamp - Date.now());
};