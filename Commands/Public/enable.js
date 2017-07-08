/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const enablePublicCommand = command => {
		command = command || "";
		command = command.trim().toLowerCase();
		if (!command.length) {
			return false;
		} else if (!serverDocument.config.commands.hasOwnProperty(command)) {
			return false;
		}
		serverDocument.config.commands[command].isEnabled = true;
		const index = serverDocument.config.commands[command].disabled_channel_ids.indexOf(msg.channel.id);
		if (~index) {
			serverDocument.config.commands[command].disabled_channel_ids.splice(index, 1);
		}
		return true;
	};
	const enablePublicCommands = (params = suffix.split(" ")) => {
		let enables = [], errors = [];
		params.forEach(param => {
			if (enablePublicCommand(param)) {
				enables.push(param);
			} else {
				errors.push(param);
			}
		});
		if (!enables.length && !errors.length) {
			winston.warn(`No parameters or invalid parameters provided for "${commandData.name}" command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `I can't enable nothing-ness!`,
					footer: {
						text: `Please tell me what command or commands I should enable in this channel, and make sure they are valid!`,
					},
				},
			});
		}
		if (enables.length && errors.length) {
			return msg.channel.createMessage({
				embed: {
					color: 0xFFFF00,
					fields: [
						{
							name: `The following commands have been enabled in this channel: ✨`,
							value: `\`\`\`css\n${enables.join(", ")}\`\`\``,
							inline: false,
						},
						{
							name: `The following commands couldn't be enabled in this channel: 😿`,
							value: `\`\`\`css\n${errors.join(", ")}\`\`\``,
							inline: false,
						},
					],
					footer: {
						text: `You can't enable inexistent commands! Also, you can use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}disable ${enables.join(" ")}" to disable the command or commands, but why would you do that..?`,
					},
				},
			});
		}
		if (enables.length) {
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					title: `The following commands have been enabled in this channel: ✨`,
					description: `\`\`\`css\n${enables.join(", ")}\`\`\``,
					footer: {
						text: `You can disable them by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}disable ${enables.join(" ")}", but why would you do that..?`,
					},
				},
			});
		}
		if (errors.length) {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					title: `The following commands couldn't be enabled: 😿`,
					description: `\`\`\`css\n${errors.join(", ")}\`\`\``,
					footer: {
						text: `Make sure you are trying to enable valid commands! If you tried enabling an extension command, please go to the dashboard instead.`,
					},
				},
			});
		}
	};
	const listEnabledCommands = (command_keys = Object.keys(serverDocument.config.commands.toJSON())) => {
		let enabled = [];
		command_keys.forEach(command_key => {
			if (!serverDocument.config.commands[command_key].disabled_channel_ids.includes(msg.channel.id)) {
				enabled.push(command_key);
			}
		});
		if (enabled.length) {
			return msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					title: `The following commands are enabled in this channel: ✨`,
					description: `\`\`\`css\n${enabled.join(", ")}\`\`\``,
					footer: {
						text: `You can disable them by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}disable <command>", but why would you do that..?`,
					},
				},
			});
		}
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				author: {
					name: `How did you even manage this?`,
				},
				description: `There are no commands enabled in this channel. 💔`,
				footer: {
					text: `You can enable some by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <command>"!`,
				},
			},
		});
	};
	// Handle command options
	switch (suffix.toLowerCase()) {
		case "":
			listEnabledCommands();
			break;
		default:
			enablePublicCommands();
	}
};
