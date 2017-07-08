const ModLog = require("./../../Modules/ModerationLogging.js");

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	const deleteModLog = id => {
		ModLog.delete(msg.channel.guild, serverDocument, id, err => {
			if (err) {
				winston.error(`Failed to delete modlog entry on server "${msg.channel.guild.name}"`, { svrid: msg.channel.guild.id }, err);
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `Oh no, something went wrong! 🥀`,
						footer: {
							text: `Make sure moderation logging is enabled and that you provided a valid case ID number.`,
						},
					},
				});
			} else {
				msg.channel.createMessage({
					embed: {
						color: 0x00FF00,
						description: `Done! Case **#${id}** is gone. 💨`,
					},
				});
			}
		});
	};
	const disable = () => {
		if (!serverDocument.modlog.isEnabled || !serverDocument.modlog.channel_id) {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `Moderation logging isn't even enabled, so I can't disable it.. ✋`,
				},
			});
		} else {
			serverDocument.modlog.isEnabled = false;
			serverDocument.modlog.channel_id = null;
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					description: `Moderation logging is now disabled. ❎`,
				},
			});
		}
	};
	const enable = chname => {
		if (chname) {
			const ch = bot.channelSearch(chname, msg.channel.guild);
			if (ch) {
				serverDocument.modlog.isEnabled = true;
				serverDocument.modlog.channel_id = ch.id;
				msg.channel.createMessage({
					embed: {
						color: 0x00FF00,
						description: `Moderation logging is now enabled in ${ch.mention}! 🙌`,
					},
				});
			} else {
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `Sorry, but I was unable to find a channel named \`${chname}\` in this server... 🚫`,
					},
				});
			}
		} else {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `I think you forgot where you wanted moderation logs to appear..\nYou need to provide a channel to enable moderation logging. 👐`,
				},
			});
		}
	};
	const args = suffix.split(" ");
	switch (args[0].trim().toLowerCase()) {
		case "delete":
		case "remove": {
			deleteModLog(args[1].trim());
			break;
		}
		case "disable": {
			disable();
			break;
		}
		case "enable": {
			enable(args[1]);
			break;
		}
		default: {
			msg.channel.createMessage({
				embed: {
					color: serverDocument.modlog.isEnabled ? 0x00FF00 : 0xFF0000,
					description: `The moderation logging in this server is currently ${serverDocument.modlog.isEnabled ? "enabled. 👍" : "disabled.. 😞"}`,
					footer: {
						text: `The commands that work with my wonderful modlog feature are: "ban", "softban", "unban", "kick", "mute", "unmute", "reason" and "strike".`,
					},
				},
			});
		}
	}
};
