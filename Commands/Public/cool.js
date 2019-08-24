const moment = require("moment");
const parseDuration = require("parse-duration");

module.exports = async ({ Constants: { Colors, Text }, client }, { channelDocument, channelQueryDocument }, msg, commandData) => {
	if (msg.suffix) {
		if (msg.suffix === "." || msg.suffix.trim().toLowerCase() === "clear") {
			channelQueryDocument.set("command_cooldown", 0);
			channelQueryDocument.set("isCommandCooldownOngoing", false);
			msg.send({
				embed: {
					color: Colors.SUCCESS,
					description: `The cooldown was removed. 🚀`,
					footer: {
						text: `Use "${msg.guild.commandPrefix}${commandData.name} ${commandData.usage}" to bring it back.`,
					},
				},
			});
		} else {
			const cooldown = parseDuration(msg.suffix.trim());
			if (cooldown && cooldown > 0 && cooldown <= 300000) {
				channelQueryDocument.set("command_cooldown", cooldown);
				msg.send({
					embed: {
						color: Colors.SUCCESS,
						description: `Set a command cooldown of **${moment.duration(cooldown).humanize()}** in this channel. 🐌`,
						footer: {
							text: `Use "${msg.guild.commandPrefix}${commandData.name} clear" to remove it`,
						},
					},
				});
			} else {
				logger.verbose(`Invalid parameters "${msg.suffix}" provided for ${commandData.name} command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				msg.send({
					embed: {
						color: Colors.INVALID,
						description: `The duration you entered is too large!`,
						footer: {
							text: `Please try a shorter duration.`,
						},
					},
				});
			}
		}
	} else if (channelDocument.command_cooldown > 0) {
		msg.send({
			embed: {
				color: Colors.INFO,
				description: `There's a cooldown of **${moment.duration(channelDocument.command_cooldown).humanize()}** set for this channel. ⏱`,
				footer: {
					text: `You can remove it by using "${msg.guild.commandPrefix}${commandData.name} clear"`,
				},
			},
		});
	} else {
		msg.send({
			embed: {
				color: Colors.INFO,
				title: `Woosh! 🎢`,
				description: `There isn't a command cooldown in this channel.\nYou can set one up by running \`${msg.guild.commandPrefix}${commandData.name} ${commandData.usage}\``,
			},
		});
	}
};
