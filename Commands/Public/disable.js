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

		if(!~serverDocument.config.commands[command].disabled_channel_ids.indexOf(msg.channel.id)) {
			serverDocument.config.commands[command].disabled_channel_ids.push(msg.channel.id);
		}

		return true;
	};

	this.disablePublicCommands = () => {
		// handle disabling of commands
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

		// nothing happened?
		if(!disables.length && !errors.length) {
			winston.warn(`No parameters provided for ${commandData.name} command`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage(`${msg.author.mention} Missing command arguments to disable.`);
			return;
		}

		const output = [];
		if(disables.length) {
			output.push(`The following commands have been disabled in this channel: 💫\`\`\`${disables.join(", ")}\`\`\``);
		}
		if(errors.length) {
			output.push(`Unable to disable the following commands in this channel: 😿\`\`\`${errors.join(". ")}\`\`\``);
		}

		msg.channel.createMessage(output.join("\n"));
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
			msg.channel.createMessage(`The following commands are disabled in this channel: 💫\`\`\`${disabled.join(", ")}\`\`\``);
			return;
		}

		msg.channel.createMessage("There are no commands disabled in this channel. 💖");
	};

	// handle command opts
	switch(suffix.toLowerCase()) {
		case "":
			this.listDisabledCommands();
			return;
		default:
			this.disablePublicCommands();
	}
};
