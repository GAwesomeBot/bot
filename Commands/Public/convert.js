module.exports = async ({ client, Constants: { Colors, Text } }, documents, msg, commandData) => {
	if (msg.suffix) {
		let args = msg.suffix.split(/\s+/);
		if (args.length === 4 && args[2].toLowerCase().trim() === "to") args.splice(2, 1);
		else if (args.length === 3 && args[1].toLowerCase().trim() === "to") args.splice(1, 1);
		if (args.length === 2) {
			const match = /(\d*)(\w*)/.exec(args[0]);
			const newArgs = [match[1], match[2], args[1]];
			args = newArgs;
		}
		if (args.length === 3 && !isNaN(args[0]) && args[1] && args[2]) {
			try {
				const { result, type } = await client.conversionHandler.convert({ content: args[0], from: args[1], to: args[2] });
				if (result && type) {
					switch (type) {
						case "money": {
							return msg.send({
								embed: {
									color: Colors.RESPONSE,
									description: `${args[0]}**${args[1].toUpperCase()}** is ${Math.round(result * 100) / 100}**${args[2].toUpperCase()}**`,
								},
							});
						}
						case "unit": {
							return msg.send({
								embed: {
									color: Colors.RESPONSE,
									description: `${args[0]}**${args[1]}** is ${result}**${args[2]}**`,
								},
							});
						}
					}
				}
			} catch (e) {
				switch (e) {
					case "FAILED_TO_CONVERT_CURRENCY_OR_UNITS": {
						return msg.send({
							embed: {
								color: Colors.SOFT_ERR,
								title: `I was unable to convert your currencies or units... 😔`,
								description: `Please make sure you use the right currency codes or the right units!\nYou can use any standard currency codes or any of [these units](https://github.com/ben-ng/convert-units#supported-units)`,
							},
						});
					}
					case "FAILED_TO_CONVERT_UNITS": {
						return msg.send({
							embed: {
								color: Colors.SOFT_ERR,
								title: `I was unable to convert your units... 😔`,
								description: `Please make sure you used the right units! 🔄\nYou can use any of [these units](https://github.com/ben-ng/convert-units#supported-units)`,
							},
						});
					}
					default: {
						return msg.send({
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
		logger.debug(`No suffix was provided for the "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id	});
		msg.sendInvalidUsage(commandData, "I need something to convert! 🤓");
	}
};
