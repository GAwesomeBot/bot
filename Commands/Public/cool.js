const moment = require("moment");
const parseDuration = require("parse-duration");

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let timestr = "";
	const time = parseDuration(suffix);
	if (!suffix) {
		if (channelDocument.command_cooldown > 0) {
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					description: `Cooldown of ${moment.duration(channelDocument.command_cooldown).humanize()} in place right now (in this channel) ⏱`,
					footer: {
						text: `You can remove it by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ."`,
					},
				},
			});
		} else {
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					description: "No command cooldown in this channel!!!11 🎢",
					footer: {
						text: `Set one up by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}"`,
					},
				},
			});
		}
		return;
	} else if (suffix === ".") {
		channelDocument.command_cooldown = 0;
		channelDocument.isCommandCooldownOngoing = false;
		msg.channel.createMessage({
			embed: {
				color: 0x00FF00,
				description: "Vroom vroom ⏩",
				footer: {
					text: `Cooldown removed! "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}" to bring it back!`,
				},
			},
		});
		return;
	} else if (suffix.split("|").length === 2 && parseDuration(suffix.split("|")[0]) > 0 && parseDuration(suffix.split("|")[1]) > 0) {
		const time1 = parseDuration(suffix.split("|")[0]);
		const time2 = parseDuration(suffix.split("|")[1]);
		if (time1 > 300000 || time2 > 3600000) {
			winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: "The numbers you've provided are too big! ( ͡° ͜ʖ ͡° )",
					footer: {
						text: `Try lowering the cool time, after all we don't want you to wait 50 years..`,
					},
				},
			});
			return;
		}
		timestr = ` of ${moment.duration(time1).humanize()} for ${moment.duration(time2).humanize()}`;
		channelDocument.command_cooldown = time1;
		setTimeout(() => {
			channelDocument.command_cooldown = 0;
			serverDocument.save(err => {
				if (err) {
					winston.error("Failed to save server data for command cooldown", { svrid: msg.channel.guild._id }, err.message);
				}
			});
		}, time2);
	} else if (time > 0) {
		if (time > 300000) {
			winston.warn(`Invalid parameters "${suffix}" provided for "${commandData.name}" command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: "The number you've provided was too big! ( ͡° ͜ʖ ͡° )",
					footer: {
						text: `Try lowering the cool time, after all, that wait time would be unnecessary..`,
					},
				},
			});
			return;
		}
		timestr = ` of ${moment.duration(time).humanize()}`;
		channelDocument.command_cooldown = time;
	} else {
		winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: "You seem confused 🤔",
				footer: {
					text: `Did you forget you need to specify time for cool? "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}" should help!`,
				},
			},
		});
		return;
	}
	msg.channel.createMessage({
		embed: {
			color: 0x00FF00,
			description: `Created command cooldown ${timestr} in this channel ⏲`,
			footer: {
				text: `You can remove it by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ."`,
			},
		},
	});
};
