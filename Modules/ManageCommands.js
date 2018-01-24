class ManageCommands {
	constructor ({ client, Constants: { Colors, Text, LoggingLevels } }, { serverDocument, channelDocument }, msg, commandData) {
		// Command stuff
		this.msg = msg;
		this.suffix = msg.suffix;
		this.channel = msg.channel;
		this.client = client;
		this.commandData = commandData;

		// Documents
		this.serverDocument = serverDocument;
		this.channelDocument = channelDocument;

		// New stuff
		this.disableAll = [];
		this.enableAll = [];

		this.disableInChannel = [];
		this.enableInChannel = [];

		// Constants
		this.Colors = Colors;
		this.Text = Text;
		this.LoggingLevels = LoggingLevels;
	}

	parse (mode = null) {
		const params = this.suffix.split(/\s+/).trimAll().toLowerCaseAll();

		for (let param of params) {
			if (param &&
				(
					(param === "enable" || param === "disable") ||
					(
						param.split(".")[0] && param.split(".")[1] &&
						(
							(param.split(".")[0].trim() === "enable" || param.split(".")[0].trim() === "disable") ||
							(param.split(".")[1].trim() === "enable" || param.split(".")[1].trim() === "disable")
						)
					)
				)
			) {
				params[params.indexOf(param)] = null;
			}
		}

		params.spliceNullElements();
		switch (mode.toLowerCase().trim()) {
			case "disable": {
				// Parse for disabling
				params.forEach(param => {
					let split = param.split(".").trimAll();
					if (split.length === 2 && split[1] === "all") {
						this.disableAll.push(split[0]);
					} else if (split.length === 2 && split[0] === "all") {
						// Some people are stupid
						this.disableAll.push(split[1]);
					} else {
						this.disableInChannel.push(param);
					}
				});
				return this.disableAll.length || this.disableInChannel.length;
			}
			case "enable": {
				// Parse for enabling
				return true;
			}
		}
	}

	async executeDisable () {
		const disabledInCh = [], disabledAll = [], invalid = [], alreadyDisabled = [];
		this.disableInChannel.length && this.disableInChannel.forEach(cmd => {
			if (this.serverDocument.config.commands.hasOwnProperty(cmd) && !this.serverDocument.config.commands[cmd].disabled_channel_ids.includes(this.channel.id)) {
				disabledInCh.push(cmd);
				this.serverDocument.config.commands[cmd].disabled_channel_ids.push(this.channel.id);
			} else if (this.serverDocument.config.commands.hasOwnProperty(cmd) && this.serverDocument.config.commands[cmd].disabled_channel_ids.includes(this.channel.id)) {
				alreadyDisabled.push(cmd);
			} else if (!invalid.includes(cmd)) { invalid.push(cmd); }
		});
		this.disableAll.length && this.disableAll.forEach(cmd => {
			if (this.serverDocument.config.commands.hasOwnProperty(cmd)) {
				disabledAll.push(cmd);
				this.serverDocument.config.commands[cmd].disabled_channel_ids = Array.from(this.msg.guild.channels.filter(c => c.type === "text").keys());
			} else if (!invalid.includes(cmd)) { invalid.push(cmd); }
		});
		let color = this.Colors.SUCCESS;
		if (invalid.length && ((disabledInCh.length || disabledAll.length) || alreadyDisabled.length)) color = this.Colors.SOFT_ERR;
		const fields = [];
		disabledInCh.length && fields.push({
			name: `The following commands were disabled in this channel 💫`,
			value: `» **${disabledInCh.join("**\n» **")}**`,
		});
		disabledAll.length && fields.push({
			name: `The following commands were disabled in __all__ channels 🤐`,
			value: `» **${disabledAll.join("**\n» **")}**`,
		});
		alreadyDisabled.length && fields.push({
			name: `The following commands are already disabled in this channel 😴`,
			value: `» **${alreadyDisabled.join("**\n» **")}**`,
		});
		invalid.length && fields.push({
			name: `The following commands were invalid 😵`,
			value: `» **${invalid.join("**\n» **")}**`,
		});
		this.channel.send({
			embed: {
				color,
				fields,
				footer: {
					text: invalid.length ? `You cannot disable inexistent commands or extension commands through this command!` : "",
				},
			},
		});
	}

	async listDisabled () {
		const commandKeys = Object.keys(this.serverDocument.config.commands.toObject());
		const allTextChannels = Array.from(this.msg.guild.channels.filter(c => c.type === "text").keys());
		const allCommands = Object.keys(require("../Configurations/commands").public);
		const disabled = [], disabledAll = [];
		commandKeys.forEach(command => {
			if (allCommands.includes(command)) {
				if (allTextChannels.every(id => this.serverDocument.config.commands[command].disabled_channel_ids.includes(id)) || !this.serverDocument.config.commands[command].isEnabled) {
					disabledAll.push(command);
				} else if (this.serverDocument.config.commands[command].disabled_channel_ids.includes(this.channel.id)) {
					disabled.push(command);
				}
			}
		});
		const fields = [];
		disabled.length && fields.push({
			name: `The following commands are disabled in this channel 💫`,
			value: `» **${disabled.join("**\n» **")}**`,
		});
		disabledAll.length && fields.push({
			name: `The following commands are disabled in __all__ channels 🤐`,
			value: `» **${disabledAll.join("**\n» **")}**`,
		});
		this.channel.send({
			embed: {
				color: this.Colors.INFO,
				fields: fields.length ? fields : [
					{
						name: `There are no commands disabled in this server! 💖`,
						value: `You can disable some by using \`${this.msg.guild.commandPrefix}${this.commandData.name} ${this.commandData.usage}\`, but why would you do that...?`,
					},
				],
			},
		});
	}
}

module.exports = ManageCommands;
