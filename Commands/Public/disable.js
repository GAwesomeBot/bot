module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	this.disablePublicCommand = command => {
		command = command || "";
		command = command.trim().toLowerCase();
		if(!command.length) {
			return false;
		}
		if(!serverDocument.config.commands.hasOwnProperty(command)) {
			return false;
		}
		if(command == "disable" || command == "enable"){
			return false;
		}
		if(!~serverDocument.config.commands[command].disabled_channel_ids.indexOf(msg.channel.id)) {
			serverDocument.config.commands[command].disabled_channel_ids.push(msg.channel.id);
		}
		return true;
	};
	this.disablePublicCommands = () => {
		// Handle disabling of commands
		const disables = [];
		const errors = [];
		const params = suffix.split(" ");
		params.forEach(param => {
			if(this.disablePublicCommand(param)) {
				disables.push(param);
			}
			else {
				errors.push(param);
			}
		});
		// Nothing Happend => Considering no commands entered
		if(!disables.length && !errors.length) {
			winston.warn(`No parameters provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0xFF0000,
					description: `Missing command or commands to disable.`
				}
			});
			return;
		}
		if(disables.length) {
            msg.channel.createMessage({
                embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x9ECDF2,
                    description: `The following commands have been disabled in this channel: 💫\`\`\`${disables.join(", ")}\`\`\``
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
                    description: `Unable to disable the following commands in this channel: 😿\`\`\`${errors.join(", ")}\`\`\``
                }
            });
		}
	};
	this.listDisabledCommands = () => {
		const command_keys = Object.keys(serverDocument.config.commands.toJSON());
		const disabled = [];
		command_keys.forEach(command_key => {
			if(~serverDocument.config.commands[command_key].disabled_channel_ids.indexOf(msg.channel.id)) {
				disabled.push(command_key);
			}
		});
		if(disabled.length) {
			msg.channel.createMessage({
				embed: {
					description: `The following commands are disabled in this channel: 💫\`\`\`${disabled.join(", ")}\`\`\``
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
				description: "There are no commands disabled in this channel. 💖"
			}
		});
	};
	// Handle Command Options
	switch(suffix.toLowerCase()) {
		case "":
			this.listDisabledCommands();
			return;
		default:
			this.disablePublicCommands();
	}
};
