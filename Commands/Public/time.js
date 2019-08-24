const moment = require("moment-timezone");

module.exports = async ({ Constants: { APIs, Colors, Text }, client }, { serverDocument }, msg, commandData) => {
	if (!msg.suffix) {
		await msg.send({
			embed: {
				color: Colors.INVALID,
				description: `I'm not entirely sure where you are, but for me it's **${moment().format("HH:mm")}** 😊`,
				footer: {
					text: `By the way, you can lookup the time in a specific timezone by using \`${msg.guild.commandPrefix}time <timezone>\`!`,
				},
			},
		});
	} else {
		const zone = moment.tz.zone(msg.suffix);
		if (!zone) {
			await msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "You're ahead of me, I don't know that timezone! 😵",
				},
			});
		} else {
			await msg.send({
				embed: {
					color: Colors.RESPONSE,
					description: `It's currently **${moment().tz(msg.suffix).format("HH:mm")}** for **${msg.suffix}**. ⏰`,
				},
			});
		}
	}
};
