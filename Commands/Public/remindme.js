const remind = require("../../Modules/MessageUtils/ReminderParser");
const moment = require("moment");

module.exports = async ({ client, Constants: { Colors, Text } }, { userDocument }, msg, commandData) => {
	if (msg.suffix) {
		const result = await remind(client, userDocument, userDocument.query, msg.suffix);
		if (result === "ERR") {
			msg.sendInvalidUsage(commandData);
		} else {
			msg.send({
				embed: {
					color: Colors.SUCCESS,
					description: `Alright, I'll remind you ${moment.duration(result).humanize(true)} ⏰`,
				},
			});
		}
	} else if (userDocument.reminders.length === 0) {
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				title: "No reminders set 😴",
				description: `You don't have any reminders set yet; use \`${commandData.name} ${commandData.usage}\` to set one.`,
			},
		});
	} else {
		const fields = userDocument.reminders.map(reminderDocument => ({
			name: `__${reminderDocument.name}__`,
			value: `${moment(reminderDocument.expiry_timestamp).fromNow()}`,
			inline: true,
		}));
		msg.send({
			embed: {
				color: Colors.INFO,
				title: `Your reminders:`,
				fields: fields.splice(0, 25),
			},
		});
	}
};
