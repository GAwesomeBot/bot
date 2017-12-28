const ArgParser = require("../../Modules/MessageUtils/Parser");

module.exports = async ({ Constants: { Colors, Text } }, documents, msg, commandData) => {
	if (msg.suffix) {
		const choices = ArgParser.parseQuoteArgs(msg.suffix, msg.suffix.includes("|") ? "|" : " ");
		msg.channel.send({
			embed: {
				color: Colors.RESPONSE,
				title: `I choose:`,
				description: `\`\`\`css\n${choices.random.trim()}\`\`\``,
				footer: {
					text: `I chose this out of ${choices.length} option${choices.length === 1 ? "" : "s"}!`,
				},
			},
		});
	} else {
		winston.verbose(`No options given for "${commandData.name}" command!`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.send({
			embed: {
				color: Colors.INVALID,
				description: Text.INVALID_USAGE(commandData, msg.guild.commandPrefix),
			},
		});
	}
};
