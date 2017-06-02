const moment = require("moment");
const parseDuration = require("parse-duration");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let str = "";
	if(suffix.toLowerCase() == "all") {
		str = " in all channels";
		serverDocument.channels.forEach(targetChannelDocument => {
			targetChannelDocument.bot_enabled = false;
		});
	} else if(parseDuration(suffix) > 0) {
		const time = parseDuration(suffix);
		if(time > 3600000) {
			winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage(`${msg.author.mention} Too big.`);
			return;
		}
		str = ` for ${moment.duration(time).humanize()}`;
		channelDocument.bot_enabled = false;
		setTimeout(() => {
			channelDocument.bot_enabled = true;
			serverDocument.save(err => {
				if(err) {
					winston.error("Failed to save server data for bot enabled", {svrid: msg.channel.guild._id}, err);
				}
			});
		}, time);
	} else {
		channelDocument.bot_enabled = false;
	}
	msg.channel.createMessage(`Ok, I'll shut up${str} 😶`);
};
