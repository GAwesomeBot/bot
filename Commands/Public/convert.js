module.exports = async ({ client, Constants: { Colors, Text, WorkerTypes } }, documents, msg, commandData) => {
	if (msg.suffix) {
		const args = msg.suffix.split(/\s+/);
		if (args.length === 4 && args[2].toLowerCase().trim() === "to") args.splice(2, 1);
		if (args.length === 3 && !isNaN(args[0]) && args[1] && args[2]) {
			let m = await msg.channel.send({
				embed: {
					color: Colors.INFO,
					title: `⌛ Converting...`,
					description: `This shouldn't take long!`,
				},
			});
			try {
				let res = await client.workerManager.getValueFromWorker(WorkerTypes.CONVERT, { data: { content: args[0], from: args[1], to: args[2] } });
				if (res.result && res.type) {
					switch (res.type) {
						case "money": {
							return m.edit({
								embed: {
									color: Colors.RESPONSE,
									description: `${args[0]}**${args[1].toUpperCase()}** is ${Math.round(res.result * 100) / 100}**${args[2].toUpperCase()}**`,
								},
							});
						}
						case "unit": {
							return m.edit({
								embed: {
									color: Colors.RESPONSE,
									description: `${args[0]}**${args[1]}** is ${res.result}**${args[2]}**`,
								},
							});
						}
					}
				}
			} catch (e) {
				switch (e) {
					case "FAILED_TO_CONVERT_CURRENCY_OR_UNITS": {
						return m.edit({
							embed: {
								color: Colors.SOFT_ERR,
								title: `I was unable to convert your currencies or units... 😔`,
								description: `Please make sure you use the right currency codes or the right units!\nYou can use any standard currency codes or any of [these units](https://github.com/ben-ng/convert-units#supported-units)`,
							},
						});
					}
					case "FAILED_TO_CONVERT_UNITS": {
						return m.edit({
							embed: {
								color: Colors.SOFT_ERR,
								title: `I was unable to convert your units... 😔`,
								description: `Please make sure you used the right units! 🔄\nYou can use any of [these units](https://github.com/ben-ng/convert-units#supported-units)`,
							},
						});
					}
					default: {
						return m.edit({
							embed: {
								color: Colors.ERR,
								title: `An unknown error occured.. This scares me!`,
								description: `This is the error I received:\`\`\`js\n${e}\`\`\``,
							},
						});
					}
				}
			}
		}
	} else {
		winston.verbose(`No suffix was provided for the "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id	});
		msg.channel.send({
			embed: {
				color: Colors.INVALID,
				title: `I need something to convert! 🤓`,
				description: Text.INVALID_USAGE(commandData, msg.guild.commandPrefix),
			},
		});
	}
};
