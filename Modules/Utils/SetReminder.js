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
		usr = await bot.users.fetch(userDocument._id, true);
	}
	if (!usr) usr = await bot.users.fetch(userDocument._id, true);
	if (usr) {
		bot.setTimeout(async () => {
			const newUserDocument = await Users.findOne({ _id: userDocument._id }).exec();
			const newReminderDocument = newUserDocument.reminders.id(reminderDocument._id);
			usr.send({
				embed: {
					color: 0x3669FA,
					title: `Hey, here's the reminder you set!`,
					description: `${newReminderDocument.name}`,
				},
			});
			newReminderDocument.remove();
			try {
				await newUserDocument.save();
				winston.verbose(`Reminded user of "${newReminderDocument.name}"`, { usrid: newUserDocument._id });
			} catch (err) {
				winston.debug(`Failed to remind user of "${newReminderDocument.name}"`, { usrid: newUserDocument._id }, err);
			}
		}, reminderDocument.expiry_timestamp - Date.now());
	}
};
