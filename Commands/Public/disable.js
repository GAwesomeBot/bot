/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const disablePublicCommand = command => {
		command = command || "";
		command = command.trim().toLowerCase();
		if (!command.length) {
			return false;
		} else if (!serverDocument.config.commands.hasOwnProperty(command)) {
			return false;
		} else if (["disable", "enable"].includes(command)) {
			return false;
		}
		if (!serverDocument.config.commands[command].disabled_channel_ids.includes(msg.channel.id)) {
			serverDocument.config.commands[command].disabled_channel_ids.push(msg.channel.id);
		}
		return true;
	};
	const disablePublicCommands = (params = suffix.split(" ")) => {
		let disables = [], errors = [];
		params.forEach(param => {
			if (disablePublicCommand(param)) {
				disables.push(param);
			} else {
				errors.push(param);
			}
		});
		if (!disables.length && !errors.length) {
			winston.warn(`No parameters or invalid parameters provided for "${commandData.name}" command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `I can't disable nothing-ness!`,
					footer: {
						text: `Please tell me what command or commands I should disable in this channel, and make sure they are valid!`,
					},
				},
			});
		}
		if (disables.length && errors.length) {
			return msg.channel.createMessage({
				embed: {
					color: 0xFFFF00,
					fields: [
						{
							name: `The following commands have been disabled in this channel: 💫`,
							value: `\`\`\`css\n${disables.join(", ")}\`\`\``,
							inline: false,
						},
						{
							name: `The following commands couldn't be disabled in this channel: 😿`,
							value: `\`\`\`css\n${errors.join(", ")}\`\`\``,
							inline: false,
						},
					],
					footer: {
						text: `You can't disable the "disable" or the "enable" commands! Also, you can use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}enable ${disables.join(" ")}" to re-enable the command or commands.`,
					},
				},
			});
		}
		if (disables.length) {
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					title: `The following commands have been disabled in this channel: 💫`,
					description: `\`\`\`css\n${disables.join(", ")}\`\`\``,
					footer: {
						text: `You can re-enable them by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}enable ${disables.join(" ")}".`,
					},
				},
			});
		}
		if (errors.length) {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					title: `The following commands couldn't be disabled in this channel: 😿`,
					description: `\`\`\`css\n${errors.join(", ")}\`\`\``,
					footer: {
						text: `You can't disable the "disable" or the "enable" commands! Also, make sure the command is valid!`,
					},
				},
			});
		}
	};
	const listDisabledCommands = (command_keys = Object.keys(serverDocument.config.commands.toJSON())) => {
		let disabled = [];
		command_keys.forEach(command_key => {
			if (serverDocument.config.commands[command_key].disabled_channel_ids.includes(msg.channel.id)) {
				disabled.push(command_key);
			}
		});
		if (disabled.length) {
			return msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					title: `The following commands are disabled in this channel: 💫`,
					description: `\`\`\`css\n${disabled.join(", ")}\`\`\``,
					footer: {
						text: `You can re-enable them by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}enable ${disabled.join(" ")}".`,
					},
				},
			});
		}
		msg.channel.createMessage({
			embed: {
				color: 0x00FF00,
				description: `There are no commands disabled in this channel. 💖`,
				footer: {
					text: `You can disable some by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <command>", but why would you do that..?`,
				},
			},
		});
	};
	// Handle command options
	switch (suffix.toLowerCase()) {
		case "":
			listDisabledCommands();
			break;
		default:
			disablePublicCommands();
	}
};
