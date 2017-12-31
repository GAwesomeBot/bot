module.exports = async ({ bot }, msg, commandData) => {
	const commands = require("../../Configurations/commands");
	let params = [];
	if (msg.suffix)	params = msg.suffix.trim().split(/\s+/);
	if (!params.length) {
		const description = [
			`To reload a PM command, use \`pm.<command>\`, where \`<command>\` is your PM command.`,
			`To reload a Public command, use \`public.<command>\`, where \`<command>\` is your Public command.`,
		].join("\n");
		return msg.channel.send({
			embed: {
				color: 0xFF0000,
				title: `You didn't provide any commands to reload!`,
				description,
				footer: {
					text: `Reload multiple commands by separating them with spaces!`,
				},
			},
		});
	}
	params.forEach(param => {
		let type = "public";
		let commandArgs = param.split(".");
		let cmd;
		if (commandArgs.length > 1) {
			type = commandArgs[0];
			cmd = commandArgs[1];
		} else {
			cmd = commandArgs[0];
		}
		// Lets check if the command type exists
		if (commands.hasOwnProperty(type)) {
			// Reload everything?
			if (cmd === "*") {
				switch (type) {
					case "pm": bot.reloadAllPrivateCommands(); break;
					case "public": bot.reloadAllPublicCommands(); break;
					case "shared": bot.reloadAllSharedCommands(); break;
				}
				winston.verbose(`Reloaded all ${type} commands!`, { usrid: msg.author.id });
				return msg.channel.send({
					embed: {
						color: 0x00FF00,
						description: `Reloaded all ${type} commands! 🎉`,
					},
				});
			}
			let fail = false;
			switch (type) {
				case "pm": fail = bot.reloadPrivateCommand(cmd, true); break;
				case "public": {
					if (!commands.public.hasOwnProperty(cmd)) {
						winston.warn(`Unable to reload ${type} command "${cmd}" because no command data was found in commands.js!`, { usrid: msg.author.id, cmd });
						return msg.channel.send({
							embed: {
								color: 0xFF0000,
								title: `Unable to reload ${type} command "${cmd}"!`,
								description: `I was unable to find any command data in \`commands.js\` about this command!`,
							},
						});
					}
					fail = bot.reloadPublicCommand(cmd, true);
					break;
				}
				case "shared": {
					if (!commands.shared.hasOwnProperty(cmd)) {
						winston.warn(`Unable to reload ${type} command "${cmd}" because no command data was found in commands.js!`, { usrid: msg.author.id, cmd });
						return msg.channel.send({
							embed: {
								color: 0xFF0000,
								title: `Unable to reload ${type} command "${cmd}"!`,
								description: `I was unable to find any command data in \`commands.js\` about this command!`,
							},
						});
					}
					fail = bot.reloadSharedCommand(cmd, true);
					break;
				}
				default: msg.channel.send({
					embed: {
						color: 0xFF0000,
						description: `I was unable to find command \`${cmd}\` of type \`${type}\`.`,
						footer: {
							text: `Did you type the command name and type correctly?`,
						},
					},
				});
			}
			if (!fail) {
				winston.verbose(`Reloaded ${type} command "${cmd}"`, { usrid: msg.author.id, cmd });
				msg.channel.send({
					embed: {
						color: 0x3669FA,
						description: `Reloaded ${type} command \`${cmd}\` successfully!`,
					},
				});
			} else if (fail) {
				winston.verbose(`Failed to reload ${type} command "${cmd}"`, { usrid: msg.author.id, cmd }, fail);
				msg.channel.send({
					embed: {
						color: 0xFF0000,
						title: `Failed to reload ${type} command "${cmd}"!`,
						description: `\`\`\`js\n${fail.stack}\`\`\``,
					},
				});
			}
		} else {
			winston.verbose(`Invalid command type or command not in commands.js provided!`, { usrid: msg.author.id, cmd });
			msg.channel.send({
				embed: {
					color: 0xFF0000,
					title: `Invalid command type (__${type}__) or command (__${cmd}__)!`,
					description: `I was unable to find any command data in \`commands.js\` about \`${cmd}\`.`,
				},
			});
		}
	});
};
