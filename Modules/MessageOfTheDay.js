// Send message of the day to a server
module.exports = (bot, winston, svr, motd) => {
	const sendMOTD = () => {
		if(motd.isEnabled && motd.message_content) {
			const ch = svr.channels.get(motd.channel_id);
			if(ch) {
				motd.last_run = Date.now();
				motd.save(err => {
					if(err) {
						winston.error("Failed to save message of the day data", {svrid: svr.id}, err);
					}
				});
				ch.createMessage(motd.message_content);
			}
			setTimeout(sendMOTD, motd.interval);
		}
	};
	if(motd.isEnabled) {
		setTimeout(() => {
			sendMOTD();
		}, (motd.last_run + motd.interval) - Date.now());
	}
};
