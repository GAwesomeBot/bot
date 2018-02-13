const { SetReminder } = require("../Utils/");
const parseDuration = require("parse-duration");

// Set a reminder from a remindme command suffix
module.exports = async (client, userDocument, str) => {
	let timestr, remind;
	const args = str.split("|").trimAll();
	if (args.length === 2) {
		// Easy parse
		remind = args[0];
		timestr = args[1];
	} else {
		// Parse with assumption "remind me to ... in ..."
		timestr = str.substring(str.toLowerCase().lastIndexOf(" in ") + 4);
		remind = str.indexOf("to ") === 0 ? str.substring(3, str.toLowerCase().lastIndexOf(" in ")) : str.substring(0, str.toLowerCase().lastIndexOf(" in "));
	}
	const time = parseDuration(timestr);
	if (time > 0 && remind) {
		userDocument.reminders.push({
			name: remind,
			expiry_timestamp: Date.now() + time,
		});
		SetReminder(client, userDocument, userDocument.reminders[userDocument.reminders.length - 1]);
		return time;
	} else {
		return "ERR";
	}
};
