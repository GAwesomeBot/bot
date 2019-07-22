const moment = require("moment");
const parseDuration = require("parse-duration");

module.exports = async ({ Constants: { Colors }, client }, { serverDocument, serverQueryDocument, channelQueryDocument }, msg, commandData) => {
	let responseString = "";
	if (msg.suffix && msg.suffix.toLowerCase().trim() === "all") {
		responseString = " in all channels";
		Object.values(serverDocument.channels).forEach(channelDocument => {
			serverQueryDocument.set(`channels.${channelDocument._id}.bot_enabled`, false);
		});
	} else if (msg.suffix && parseDuration(msg.suffix) > 0) {
		const time = parseDuration(msg.suffix);
		if (time > 3600000) {
			return msg.send({
				embed: {
					color: Colors.INVALID,
					description: "I can't miss you guys for that long!",
					footer: {
						text: "Try a shorter duration or no duration at all for an indefinitely long period",
					},
				},
			});
		}
		responseString = ` for ${moment.duration(time).humanize()}`;
		channelQueryDocument.set("bot_enabled", false);
		client.setTimeout(() => {
			channelQueryDocument.set("bot_enabled", true);
			serverDocument.save().catch(err => {
				logger.warn("Failed to save server data for automatically starting the bot in a channel.", { svrid: msg.guild.id }, err);
			});
		}, time);
	} else {
		channelQueryDocument.set("bot_enabled", false);
	}
	msg.send({
		embed: {
			color: Colors.SUCCESS,
			description: `Ok, I'll be quiet${responseString} 😶`,
		},
	});
};
