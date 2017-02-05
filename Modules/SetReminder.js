// Set a reminder for a user
module.exports = (bot, winston, userDocument, reminderDocument) => {
	setTimeout(() => {
		const usr = bot.users.get(userDocument._id);
		if(usr) {
			usr.getDMChannel().then(ch => {
				ch.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
						color: 0x9ECDF2,
						title: "**Reminder**",
						description: `${reminderDocument.name}`
					}
				});
			});
			reminderDocument.remove();
			userDocument.save(err => {
				if(err) {
					winston.error(`Failed to remind user of '${reminderDocument.name}'`, {usrid: userDocument._id}, err);
				} else {
					winston.info(`Reminded user of '${reminderDocument.name}'`, {usrid: userDocument._id});
				}
			});
		}
	}, reminderDocument.expiry_timestamp - Date.now());
};