const moment = require("moment");

module.exports = async ({ Constants: { Colors } }, documents, msg, commandData) => {
	const now = new Date;
	const next = new Date(now);
	next.setFullYear(now.getFullYear() + 1);
	next.setHours(0, 0, 0, 0);
	next.setMonth(0, 1);
	return msg.send({
		embed: {
			color: Colors.INFO,
			description: `There are **${moment.duration(next - now).humanize()}** until **${next.getFullYear()}**! 🎆`,
		},
	});
};
