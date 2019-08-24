/**
 * 8ball!
 */
module.exports = async (main, documents, msg, commandData) => {
	const { Utils: { PromiseWait }, Constants: { Colors, EightBall: { WaitTimes, Answers } } } = main;
	if (msg.suffix) {
		await msg.send({
			embed: {
				color: Colors.BLUE,
				description: `Asking the 🎱 your question..`,
				footer: {
					text: `Please wait...`,
				},
			},
		});
		await PromiseWait(WaitTimes[Math.floor(Math.random() * WaitTimes.length)]);
		const randomChoice = Answers[Math.floor(Math.random() * Answers.length)];
		msg.send({
			embed: {
				description: `Our 🎱 replied with:\`\`\`css\n${randomChoice.answer}\`\`\``,
				color: randomChoice.color,
			},
		});
	} else {
		logger.verbose(`No suffix was provided for the "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id	});
		msg.send({
			embed: {
				color: Colors.RED,
				description: `You tell me... 😜`,
				footer: {
					text: `Psst. You need to ask the 8ball a question, ya'know?`,
				},
			},
		});
	}
};
