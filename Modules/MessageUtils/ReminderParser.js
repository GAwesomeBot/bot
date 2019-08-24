const { SetReminder } = require("../Utils/");
const parseDuration = require("parse-duration");
const { ObjectID } = require("mongodb");

// Set a reminder from a remindme command suffix
module.exports = async (client, userDocument, userQueryDocument, str) => {
	let timestr, remind;
	const args = str.split("|").trimAll();
	if (args.length === 2) {
		// Easy parse
		[remind, timestr] = args;
	} else {
		// Parse with assumption "remind me to ... in ..."
		timestr = str.substring(str.toLowerCase().lastIndexOf(" in ") + 4);
		remind = str.indexOf("to ") === 0 ? str.substring(3, str.toLowerCase().lastIndexOf(" in ")) : str.substring(0, str.toLowerCase().lastIndexOf(" in "));
	}
	const time = parseDuration(timestr);
	if (time > 0 && remind) {
		userQueryDocument.push("reminders", {
			_id: ObjectID().toString(),
			name: remind,
			expiry_timestamp: Date.now() + time,
		});
		await SetReminder(client, userDocument, userDocument.reminders[userDocument.reminders.length - 1]);
		return time;
	} else {
		return "ERR";
	}
};
