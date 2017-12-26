module.exports = async ({ client, Constants: { Colors, Text, WorkerTypes, WorkerCommands: { MATHJS: MathJS } } }, documents, msg, commandData) => {
	if (msg.suffix) {
		let args = msg.suffix.split(/\s+/);
		if (args[0].trim().toLowerCase() === "help") {
			try {
				args.shift();
				args = args.join(" ");
				let helpstr = await client.workerManager.getValueFromWorker(WorkerTypes.MATH, { command: MathJS.HELP, data: args });
				msg.channel.send({
					embed: {
						color: Colors.INFO,
						description: `\`\`\`css\n${helpstr}\`\`\``,
					},
				});
			} catch (err) {
				let description = [
					`Couldn't find any help message for \`${args}\`!`,
					"",
					"We use **[MathJS](http://mathjs.org/)** to calculate your equations.",
					"Read more about what it can and can't do by clicking [here](http://mathjs.org/)",
				].join("\n");
				msg.channel.send({
					embed: {
						color: Colors.SOFT_ERR,
						description,
						footer: {
							text: `Make sure you typed it right!`,
						},
					},
				});
			}
		} else {
			let m = await msg.channel.send({
				embed: {
					color: Colors.INFO,
					title: `⌛ Calculating...`,
					description: `This shouldn't take long!`,
				},
			});
			try {
				let res = await client.workerManager.getValueFromWorker(WorkerTypes.MATH, { command: MathJS.EVAL, data: msg.suffix.trim() });
				m.edit({
					embed: {
						color: Colors.RESPONSE,
						title: `Here is your result!`,
						author: {
							name: `Results provided by MathJS`,
							url: `http://mathjs.org/`,
						},
						description: `\`\`\`css\n${res}\`\`\``,
					},
				});
			} catch (err) {
				m.edit({
					embed: {
						color: Colors.ERR,
						title: Text.COMMAND_ERR(),
						description: `\`\`\`css\n${err}\`\`\``,
						footer: {
							text: `I'm sorry :(`,
						},
					},
				});
			}
		}
	} else {
		winston.verbose(`No mathematical equation provided for "${commandData.name}" command!`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.send({
			embed: {
				color: Colors.INVALID,
				title: `What would you like to calculate today? 🤓`,
				description: Text.INVALID_USAGE(commandData, msg.guild.commandPrefix),
				footer: {
					text: `I may be smart but I can't guess what you'd want to calculate!`,
				},
			},
		});
	}
};
