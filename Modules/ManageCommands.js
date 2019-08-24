const Gist = require("./Utils/GitHubGist");

class ManageCommands {
	constructor ({ client, Constants: { Colors, Text, LoggingLevels } }, { serverDocument, serverQueryDocument, channelDocument, channelQueryDocument }, msg, commandData) {
		// Command stuff
		this.msg = msg;
		this.suffix = msg.suffix;
		this.channel = msg.channel;
		this.client = client;
		this.commandData = commandData;

		// Documents
		this.serverDocument = serverDocument;
		this.serverQueryDocument = serverQueryDocument;
		this.channelDocument = channelDocument;
		this.channelQueryDocument = channelQueryDocument;

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

		for (const param of params) {
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
					const split = param.split(".").trimAll();
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
				params.forEach(param => {
					const split = param.split(".").trimAll();
					if (split.length === 2 && split[1] === "all") {
						this.enableAll.push(split[0]);
					} else if (split.length === 2 && split[0] === "all") {
						// Some people are stupid
						this.enableAll.push(split[1]);
					} else {
						this.enableInChannel.push(param);
					}
				});
				return this.enableAll.length || this.enableInChannel.length;
			}
		}
	}

	async executeDisable () {
		const disabledInCh = [], disabledAll = [], invalid = [], alreadyDisabled = [];
		this.disableInChannel.length && this.disableInChannel.forEach(cmd => {
			if (this.serverDocument.config.commands.hasOwnProperty(cmd) && !this.serverDocument.config.commands[cmd].disabled_channel_ids.includes(this.channel.id)) {
				disabledInCh.push(cmd);
				this.serverQueryDocument.push(`config.commands.${cmd}.disabled_channel_ids`, this.channel.id);
			} else if (this.serverDocument.config.commands.hasOwnProperty(cmd) && this.serverDocument.config.commands[cmd].disabled_channel_ids.includes(this.channel.id)) {
				alreadyDisabled.push(cmd);
			} else if (!invalid.includes(cmd)) { invalid.push(cmd); }
		});
		this.disableAll.length && this.disableAll.forEach(cmd => {
			if (this.serverDocument.config.commands.hasOwnProperty(cmd)) {
				disabledAll.push(cmd);
				this.serverQueryDocument.set(`config.commands.${cmd}.disabled_channel_ids`, Array.from(this.msg.guild.channels.filter(c => c.type === "text").keys()));
			} else if (!invalid.includes(cmd)) { invalid.push(cmd); }
		});
		let color = this.Colors.SUCCESS;
		if (invalid.length) color = this.Colors.SOFT_ERR;
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
		this.msg.send({
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
		const commandKeys = Object.keys(this.serverDocument.config.commands);
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
		this.msg.send({
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

	async executeEnable () {
		const enabledInCh = [], enabledAll = [], invalid = [], alreadyEnabled = [];
		this.enableInChannel.length && this.enableInChannel.forEach(cmd => {
			if (this.serverDocument.config.commands.hasOwnProperty(cmd)) {
				this.serverQueryDocument.set(`config.commands.${cmd}.isEnabled`, true);
				const index = this.serverDocument.config.commands[cmd].disabled_channel_ids.indexOf(this.channel.id);
				if (~index) {
					this.serverQueryDocument.pull(`config.commands.${cmd}.disabled_channel_ids`, this.channel.id);
					enabledInCh.push(cmd);
				} else {
					alreadyEnabled.push(cmd);
				}
			} else if (!invalid.includes(cmd)) { invalid.push(cmd); }
		});
		this.enableAll.length && this.enableAll.forEach(cmd => {
			if (this.serverDocument.config.commands.hasOwnProperty(cmd)) {
				this.serverQueryDocument.set(`config.commands.${cmd}.isEnabled`, true);
				this.serverQueryDocument.set(`config.commands.${cmd}.disabled_channel_ids`, []);
				enabledAll.push(cmd);
			} else if (!invalid.includes(cmd)) { invalid.push(cmd); }
		});
		let color = this.Colors.SUCCESS;
		if (invalid.length) color = this.Colors.SOFT_ERR;
		const fields = [];
		enabledInCh.length && fields.push({
			name: `The following commands were enabled in this channel ✨`,
			value: `» **${enabledInCh.join("**\n» **")}**`,
		});
		enabledAll.length && fields.push({
			name: `The following commands were enabled in __all__ channels 🎉`,
			value: `» **${enabledAll.join("**\n» **")}**`,
		});
		alreadyEnabled.length && fields.push({
			name: `The following commands are already enabled in this channel 😴`,
			value: `» **${alreadyEnabled.join("**\n» **")}**`,
		});
		invalid.length && fields.push({
			name: `The following commands were invalid 😵`,
			value: `» **${invalid.join("**\n» **")}**`,
		});
		this.msg.send({
			embed: {
				color,
				fields,
				footer: {
					text: invalid.length ? "You cannot enable inexistent commands or extension commands through this command!" : "",
				},
			},
		});
	}

	async listEnabled () {
		const commandKeys = Object.keys(this.serverDocument.config.commands);
		const allCommands = Object.keys(require("../Configurations/commands").public);
		const enabled = [], enabledAll = [];
		commandKeys.forEach(command => {
			if (allCommands.includes(command)) {
				if (this.serverDocument.config.commands[command].isEnabled && this.serverDocument.config.commands[command].disabled_channel_ids.length === 0) {
					enabledAll.push(command);
				} else if (this.serverDocument.config.commands[command].isEnabled && !this.serverDocument.config.commands[command].disabled_channel_ids.includes(this.channel.id)) {
					enabled.push(command);
				}
			}
		});
		const gistUploader = new Gist(this.client);
		const fields = [];
		let enabledString = `» **${enabled.join("**\n» **")}**`;
		const enabledAllString = `» **${enabledAll.join("**\n» **")}**`;
		if (enabledString.length > 1024) {
			enabledString = `» **${enabled.join("**\n\n» **")}**`;
			const res = await gistUploader.upload({
				title: `Enabled Commands in "${this.channel.name}"`,
				text: enabledString,
				file: "commands.md",
			});
			if (res.url) {
				enabledString = `There are so many enabled commands, I cannot list them all!\nPlease go [here](${res.url}) to see them all!`;
			}
		}
		enabled.length && fields.push({
			name: `The following commands are enabled in this channel ✨`,
			value: enabledString,
		});
		this.msg.send({
			embed: {
				color: this.Colors.INFO,
				description: enabledAllString.length ? `**The following commands are enabled in __all__ channels** 🎉\n\n${enabledAllString}` : "",
				fields: fields.length ? fields : !enabledAllString.length ? [
					{
						name: `There are no commands enabled in this server. 😔`,
						value: `You can enable some by using \`${this.msg.guild.commandPrefix}${this.commandData.name} ${this.commandData.usage}\``,
					},
				] : [],
				footer: {
					text: fields.length ? "" : enabledAllString.length ? "" : "Wait... How did you manage to get this message?!",
				},
			},
		});
	}
}

module.exports = ManageCommands;
