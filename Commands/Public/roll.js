const ArgParser = require("../../Modules/MessageUtils/Parser");

module.exports = async ({ Constants: { Colors, Text }, Utils: { PromiseWait } }, documents, msg, commandData) => {
	let min = 1;
	let max = 6;
	if (msg.suffix) {
		const choices = ArgParser.parseQuoteArgs(msg.suffix, " ");
		if (choices.length === 1) {
			max = +choices[0];
		} else {
			min = +choices[0];
			max = +choices[1];
		}
	}
	if (!isFinite(min) || !isFinite(max)) {
		return msg.send({
			embed: {
				color: Colors.INVALID,
				title: "Those aren't valid numbers! 🔢",
				description: Text.INVALID_USAGE(commandData, msg.guild.commandPrefix),
			},
		});
	}
	if (min > max) {
		[min, max] = [max, min];
	}
	const randNum = Math.floor(Math.random() * (max - min + 1)) + min;
	await msg.send({
		embed: {
			color: Colors.INFO,
			description: "Rolling your number... 🎲",
		},
	});
	await PromiseWait(2000);
	msg.send({
		embed: {
			color: Colors.SUCCESS,
			description: `You rolled a ${randNum}! 🎲`,
		},
	});
};
