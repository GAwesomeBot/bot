module.exports = async ({ client, Constants: { Colors, Text, WorkerTypes, WorkerCommands: { MATHJS: MathJS } } }, documents, msg, commandData) => {
	if (msg.suffix) {
		let args = msg.suffix.split(/\s+/);
		if (args[0].trim().toLowerCase() === "help") {
			try {
				args.shift();
				args = args.join(" ");
				const helpstr = await client.workerManager.getValueFromWorker(WorkerTypes.MATH, { command: MathJS.HELP, data: args });
				msg.send({
					embed: {
						color: Colors.INFO,
						description: `\`\`\`css\n${helpstr}\`\`\``,
					},
				});
			} catch (err) {
				const description = [
					`Couldn't find any help message for \`${args}\`!`,
					"",
					"We use **[MathJS](http://mathjs.org/)** to calculate your equations.",
					"Read more about what it can and can't do by clicking [here](http://mathjs.org/)",
				].join("\n");
				msg.send({
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
			await msg.send({
				embed: {
					color: Colors.INFO,
					title: `⌛ Calculating...`,
					description: `This shouldn't take long!`,
				},
			});
			try {
				const res = await client.workerManager.getValueFromWorker(WorkerTypes.MATH, { command: MathJS.EVAL, data: msg.suffix.trim() });
				msg.send({
					embed: {
						color: Colors.RESPONSE,
						title: `Here is your result!`,
						author: {
							name: `Results provided with MathJS`,
							url: `http://mathjs.org/`,
						},
						description: `\`\`\`css\n${res}\`\`\``,
					},
				});
			} catch (err) {
				msg.send({
					embed: {
						color: Colors.ERR,
						title: Text.ERROR_TITLE(),
						description: Text.ERROR_BODY("calc", err),
						footer: {
							text: `I'm sorry :(`,
						},
					},
				});
			}
		}
	} else {
		logger.debug(`No mathematical equation provided for "${commandData.name}" command!`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.sendInvalidUsage(commandData, "What would you like to calculate today? 🤓", "I may be smart but I can't guess what you'd want to calculate!");
	}
};
