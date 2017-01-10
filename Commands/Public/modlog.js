const ModLog = require("./../../Modules/ModerationLogging.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	this.delete = id => {
		ModLog.delete(msg.guild, serverDocument, id, err => {
			if(err) {
				winston.error(`Failed to delete modlog entry on server '${msg.guild.name}'`, {svrid: msg.guild.id}, err);
				msg.channel.createMessage("Oh no! Something went wrong. 🥀 Make sure moderation logging is enabled and that you provided a valid case ID number.");
			} else {
				msg.channel.createMessage(`Done! Case #${id} is gone 💨`);
			}
		});
	};

	this.disable = () => {
		if(!serverDocument.modlog.isEnabled || !serverDocument.modlog.channel_id) {
			msg.channel.createMessage("Moderation logging is not enabled. ✋");
		} else {
			serverDocument.modlog.isEnabled = false;
			serverDocument.modlog.channel_id = null;
			msg.channel.createMessage("Moderation logging is now disabled. ❎");
		}
	};

	this.enable = chname => {
		if(chname) {
			const ch = bot.channelSearch(chname, msg.guild);
			if(ch) {
				serverDocument.modlog.isEnabled = true;
				serverDocument.modlog.channel_id = ch.id;
				msg.channel.createMessage(`Moderation logging enabled in ${ch.mention} 🙌`);
			} else {
				msg.channel.createMessage(`Unable to find channel \`${chname}\` 🚫`);
			}
		} else {
			msg.channel.createMessage("A channel is required to enable moderation logging. 👐");
		}
	};

	const args = suffix.split(" ");
	switch(args[0].toLowerCase()) {
		case "delete":
		case "remove":
			this.delete(args[1]);
			break;
		case "disable":
			this.disable();
			break;
		case "enable":
			this.enable(args[1]);
			break;
		default:
			msg.channel.createMessage(`Modlog is currently ${serverDocument.modlog.log_channel ? "enabled" : "disabled"}. 😺 The commands that work with my wonderful modlog feature are: \`ban\`, \`kick\`, \`mute\`, \`reason\`, \`softban\`, \`unban\`, \`unmute\`, \`warn\``);
			break;
	}
};
