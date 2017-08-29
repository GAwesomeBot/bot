/**
 * Set a reminder for a user
 * @param bot The bot instance
 * @param {Document} userDocument The full user document
 * @param {Document} reminderDocument The reminder document
 */
module.exports = async (bot, userDocument, reminderDocument) => {
	let usr;
	try {
		usr = bot.users.get(userDocument._id);
	} catch (err) {
		usr = await bot.users.fetch(userDocument._id, false);
	}
	if (usr) {
		bot.setTimeout(async () => {
			usr.send({
				embed: {
					color: 0x3669FA,
					title: `Hey, here's the reminder you set!`,
					description: `${reminderDocument.name}`,
				},
			});
			reminderDocument.remove();
			try {
				await userDocument.save();
				winston.info(`Reminded user of "${reminderDocument.name}"`, { usrid: userDocument._id });
			} catch (err) {
				winston.error(`Failed to remind user of "${reminderDocument.name}"`, { usrid: userDocument._id }, err);
			}
		}, reminderDocument.expiry_timestamp - Date.now());
	}
};
