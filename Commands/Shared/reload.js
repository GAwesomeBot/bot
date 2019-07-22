module.exports = async ({ client, Constants: { Colors } }, msg, commandData) => {
	const commands = require("../../Configurations/commands");
	let params = [];
	if (msg.suffix)	params = msg.suffix.trim().split(/\s+/);
	if (!params.length) {
		const description = [
			`To reload a PM command, use \`pm.<command>\`, where \`<command>\` is your PM command.`,
			`To reload a Public command, use \`public.<command>\`, where \`<command>\` is your Public command.`,
			`To reload a Shared command, use \`shared.<command>\`, where \`<command>\` is your Shared command.`,
			`To reload an Event, use \`events.<event>\`, where \`<event>\` is your Event name.`,
		].join("\n");
		return msg.send({
			embed: {
				color: Colors.INVALID,
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
		const commandArgs = param.split(".");
		let cmd;
		if (commandArgs.length > 1) {
			[type, cmd] = commandArgs;
		} else {
			[cmd] = commandArgs;
		}

		// Alternative reload types (events, routes, modules)
		if (["events", "routes", "modules"].includes(type)) {
			switch (type) {
				case "events": {
					try {
						client.events.reloadEvent(cmd);
						logger.verbose(`Reloaded ${cmd === "*" ? "all " : ""}event${cmd === "*" ? "s" : ` "${cmd}"`}`, { usrid: msg.author.id, cmd });
						msg.send({
							embed: {
								color: Colors.SUCCESS,
								description: cmd === "*" ? `Reloaded all events successfully! 🎉` : `Reloaded event \`${cmd}\` successfully!`,
							},
						});
					} catch (err) {
						logger.warn(`Failed to reload event ${cmd}!`, { usrid: msg.author.id, event: cmd }, err);
						if (err.code === "UNKNOWN_EVENT") {
							return msg.send({
								embed: {
									color: Colors.SOFT_ERR,
									title: `Unable to reload event ${cmd}!`,
									description: `I was unable to find any event data in \`events.js\` about this event!`,
								},
							});
						}
						return msg.send({
							embed: {
								color: Colors.ERR,
								title: `Unable to reload event ${cmd}!`,
								description: `An exception occurred while attempting to reload event \`${cmd}\`:\n\`\`\`js\n${err.stack}\`\`\``,
							},
						});
					}
					break;
				}
				default: msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: `Unable to find type ${type}!`,
						description: `I was unable to find any data this type!`,
					},
				});
			}
		// Lets check if the command type exists
		} else if (commands.hasOwnProperty(type)) {
			// Reload everything?
			if (cmd === "*") {
				switch (type) {
					case "pm": client.reloadAllPrivateCommands(); break;
					case "public": client.reloadAllPublicCommands(); break;
					case "shared": client.reloadAllSharedCommands(); break;
				}
				logger.verbose(`Reloaded all ${type} commands!`, { usrid: msg.author.id });
				return msg.send({
					embed: {
						color: Colors.SUCCESS,
						description: `Reloaded all ${type} commands! 🎉`,
					},
				});
			}
			let fail = false;
			switch (type) {
				case "pm": fail = client.reloadPrivateCommand(cmd, true); break;
				case "public": {
					cmd = client.getPublicCommandName(cmd);
					if (!commands.public.hasOwnProperty(cmd)) {
						logger.debug(`Unable to reload ${type} command "${cmd}" because no command data was found in commands.js!`, { usrid: msg.author.id, cmd });
						return msg.send({
							embed: {
								color: Colors.SOFT_ERR,
								title: `Unable to reload ${type} command "${cmd}"!`,
								description: `I was unable to find any command data in \`commands.js\` about this command!`,
							},
						});
					}
					fail = client.reloadPublicCommand(cmd, true);
					break;
				}
				case "shared": {
					cmd = client.getSharedCommandName(cmd);
					if (!commands.shared.hasOwnProperty(cmd)) {
						logger.debug(`Unable to reload ${type} command "${cmd}" because no command data was found in commands.js!`, { usrid: msg.author.id, cmd });
						return msg.send({
							embed: {
								color: Colors.SOFT_ERR,
								title: `Unable to reload ${type} command "${cmd}"!`,
								description: `I was unable to find any command data in \`commands.js\` about this command!`,
							},
						});
					}
					fail = client.reloadSharedCommand(cmd, true);
					break;
				}
				default: msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `I was unable to find command \`${cmd}\` of type \`${type}\`.`,
						footer: {
							text: `Did you type the command name and type correctly?`,
						},
					},
				});
			}
			if (!fail) {
				logger.verbose(`Reloaded ${type} command "${cmd}"`, { usrid: msg.author.id, cmd });
				msg.send({
					embed: {
						color: Colors.SUCCESS,
						description: `Reloaded ${type} command \`${cmd}\` successfully!`,
					},
				});
			} else if (fail) {
				logger.verbose(`Failed to reload ${type} command "${cmd}"`, { usrid: msg.author.id, cmd }, fail);
				msg.send({
					embed: {
						color: Colors.ERR,
						title: `Failed to reload ${type} command "${cmd}"!`,
						description: `\`\`\`js\n${fail.stack}\`\`\``,
					},
				});
			}
		} else {
			logger.verbose(`Invalid command type or command not in commands.js provided!`, { usrid: msg.author.id, cmd });
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					title: `Invalid command type (__${type}__) or command (__${cmd}__)!`,
					description: `I was unable to find any command data in \`commands.js\` about \`${cmd}\`.`,
				},
			});
		}
	});
};
