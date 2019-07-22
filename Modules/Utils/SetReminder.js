/**
 * Set a reminder for a user
 * @param client The client instance
 * @param {Document} userDocument The full user document
 * @param {Document} reminderDocument The reminder document
 */
module.exports = async (client, userDocument, reminderDocument) => {
	let usr;
	try {
		usr = client.users.get(userDocument._id);
	} catch (err) {
		usr = await client.users.fetch(userDocument._id, true);
	}
	if (!usr) usr = await client.users.fetch(userDocument._id, true);
	if (usr) {
		client.setTimeout(async () => {
			const newUserDocument = await Users.findOne(userDocument._id);
			const newReminderQueryDocument = newUserDocument.query.id("reminders", reminderDocument._id);
			const newReminderDocument = newReminderQueryDocument.val;
			try {
				await usr.send({
					embed: {
						color: 0x3669FA,
						title: `Hey, here's the reminder you set!`,
						description: `${newReminderDocument.name}`,
					},
				});
				newReminderQueryDocument.remove();
				await newUserDocument.save();
				logger.verbose(`Reminded user of "${newReminderDocument.name}"`, { usrid: newUserDocument._id });
			} catch (err) {
				logger.debug(`Failed to remind user of "${newReminderDocument.name}"`, { usrid: newUserDocument._id }, err);
			}
		}, reminderDocument.expiry_timestamp - Date.now());
	}
};
