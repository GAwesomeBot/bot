module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	this.enablePublicCommand = command => {
		command = command || "";
		command = command.trim().toLowerCase();
		if(!command.length) {
			return false;
		}
		if(!serverDocument.config.commands.hasOwnProperty(command)) {
			return false;
		}
		serverDocument.config.commands[command].isEnabled = true;
		const index = serverDocument.config.commands[command].disabled_channel_ids.indexOf(msg.channel.id);
		if(~index) {
			serverDocument.config.commands[command].disabled_channel_ids.splice(index, 1);
		}
		return true;
	};
	this.enablePublicCommands = () => {
		// Handle enabling of commands
		const enables = [];
		const errors = [];
		const params = suffix.split(" ");
		params.forEach(param => {
			if(this.enablePublicCommand(param)) {
				enables.push(param);
			} else {
				errors.push(param);
			}
		});
		// Nothing Happend => Considering no commands entered
		if(!enables.length && !errors.length) {
			winston.warn(`No parameters provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0xFF0000,
					description: `Missing command or commands to enable.`
				}
			});
			return;
		}
		if(enables.length) {
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
					description: `The following commands have been enabled in this channel: ✨\`\`\`${enables.join(", ")}\`\`\``
				}
			});
		}
		if(errors.length) {
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0xFF0000,
					description: `Unable to enable the following commands in this channel: 😿\`\`\`${errors.join(". ")}\`\`\``
				}
			});
		}
	};
	this.listEnabledCommands = () => {
		const command_keys = Object.keys(serverDocument.config.commands.toJSON());
		const enabled = [];
		command_keys.forEach(command_key => {
			if(!~serverDocument.config.commands[command_key].disabled_channel_ids.indexOf(msg.channel.id)) {
				enabled.push(command_key);
			}
		});
		if(enabled.length) {
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
					description: `The following commands are enabled in this channel: ✨\`\`\`${enabled.join(", ")}\`\`\``
				}
			});
			return;
		}
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0xFF0000,
				description: "There are no commands enabled in this channel. 💔"
			}
		});
	};
	// Handle Command Options
	switch(suffix.toLowerCase()) {
		case "":
			this.listEnabledCommands();
			return;
		default:
			this.enablePublicCommands();
	}
};
