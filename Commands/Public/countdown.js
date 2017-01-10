const setCountdown = require("./../../Modules/setCountdown.js");
const moment = require("moment");
const parseDuration = require("parse-duration");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		if(suffix.indexOf("|")>-1 && suffix.length>=3) {
			const args = [
				suffix.substring(0, suffix.indexOf("|")).trim(),
				suffix.substring(suffix.indexOf("|")+1).trim()
			];
			let countdownDocument = serverDocument.config.countdown_data.id(args[0]);

			if(countdownDocument) {
				msg.channel.createMessage(`**${countdownDocument._id}** already exists. ⏰ Wait until it expires.`);
			} else {
				const time = parseDuration(args[1]);
				if(time>0) {
					const expiry = Date.now() + time;
					serverDocument.config.countdown_data.push({
						_id: args[0],
						channel_id: msg.channel.id,
						expiry_timestamp: expiry
					});
					countdownDocument = serverDocument.config.countdown_data.id(args[0]);
					setCountdown(bot, winston, serverDocument, countdownDocument);
					msg.channel.createMessage(`Alright, set **${args[0]}** to expire ${moment(expiry).fromNow()} 🙃`);
				} else {
					msg.channel.createMessage(`\`${args[1]}\` is not a valid length of time`);
				}
			}
		} else {
			const countdownDocument = serverDocument.config.countdown_data.id(suffix);
			if(countdownDocument) {
				msg.channel.createMessage(`${countdownDocument._id} expires ${moment(countdownDocument.expiry_timestamp).fromNow()} ⌛️`);
			} else {
				msg.channel.createMessage(`That countdown doesn't exist. Use \`${bot.getCommandPrefix(msg.guild, serverDocument)}${commandData.name} ${suffix}|<time>\` to create it.`);
			}
		}
	} else {
		const info = serverDocument.config.countdown_data.filter(countdownDocument => {
			return msg.guild.channels.has(countdownDocument.channel_id);
		}).sort((a, b) => {
			return a.expiry_timestamp - b.expiry_timestamp;
		}).map(countdownDocument => {
			return `${countdownDocument._id}: in #${msg.guild.channels.get(countdownDocument.channel_id).name} ${moment(countdownDocument.expiry_timestamp).fromNow()}`;
		});
		if(info.length>0) {
			msg.channel.createMessage(`**⏱ ${info.length} countdown${info.length==1 ? "" : "s"} on this server**\n\t${info.join("\n\t")}`);
		} else {
			msg.channel.createMessage(`There aren't any countdowns on this server. Use \`${bot.getCommandPrefix(msg.guild, serverDocument)}${commandData.name} <event>|<time from now>\` to create one. 🐬`);
		}
	}
};
