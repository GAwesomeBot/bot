const setCountdown = require("./../../Modules/SetCountdown.js");
const moment = require("moment");
const parseDuration = require("parse-duration");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (suffix) {
		if (suffix.indexOf("|") > -1 && suffix.length >= 3) {
			let args = [
				suffix.split("|")[0],
				suffix.split("|")[1],
			];
			let countdownDocument = serverDocument.config.countdown_data.id(args[0]);
			if (countdownDocument) {
				msg.channel.createMessage({
					embed: {
						color: 0x9ECDF2,
						description: `**${countdownDocument._id}** already exists. ⏰`,
						footer: {
							text: `Wait until it expires.`,
						},
					},
				});
			} else {
				let time = parseDuration(args[1]);
				if (time > 0) {
					let expiry = Date.now() + time;
					serverDocument.config.countdown_data.push({
						_id: args[0],
						channel_id: msg.channel.id,
						expiry_timestamp: expiry,
					});
					countdownDocument = serverDocument.config.countdown_data.id(args[0]);
					setCountdown(bot, winston, serverDocument, countdownDocument);
					msg.channel.createMessage({
						embed: {
							color: 0x00FF00,
							description: `Alright, set **${args[0]}** to expire ${moment(expiry).fromNow()} 🙃`,
						},
					});
				} else {
					msg.channel.createMessage({
						embed: {
							color: 0xFF0000,
							description: `\`${args[1]}\` is not a valid length of time!`,
							footer: {
								text: `You can use things like "10 minutes" or "one hour", and I will detect it!`,
							},
						},
					});
				}
			}
		} else {
			let countdownDocument = serverDocument.config.countdown_data.id(suffix);
			if (countdownDocument) {
				msg.channel.createMessage({
					embed: {
						color: 0x00FF00,
						description: `\`${countdownDocument._id}\` expires ${moment(countdownDocument.expiry_timestamp).fromNow()} ⌛`,
					},
				});
			} else {
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `That countdown doesn't exist.`,
						footer: {
							text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${suffix}|<time>" to create it.`,
						},
					},
				});
			}
		}
	} else {
		/* eslint-disable arrow-body-style */
		let countdowns = serverDocument.config.countdown_data.filter(countdownDocument => {
			return msg.channel.guild.channels.has(countdownDocument.channel_id);
		}).sort((a, b) => {
			return a.expiry_timestamp - b.expiry_timestamp;
		}).map(countdownDocument => { //eslint-disable-next-line
			return `\`${countdownDocument._id}\` in ${msg.channel.guild.channels.get(countdownDocument.channel_id).mention} expires **${moment(countdownDocument.expiry_timestamp).fromNow()}**`;
		});
		if (countdowns.length > 0) {
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					title: `**${countdowns.length} countdown${countdowns.length === 1 ? "" : "s"} in this server** ⏱`,
					description: countdowns.join(",\n"),
				},
			});
		} else {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `There aren't any countdowns on this server.`,
					footer: {
						text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <event>|<time from now>" to create one. 🐬`,
					},
				},
			});
		}
	}
};
