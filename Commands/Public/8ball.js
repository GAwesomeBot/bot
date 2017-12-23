/**
 * 8ball!
 */
module.exports = async (main, documents, msg, commandData) => {
	const { Utils: { PromiseWait }, Constants: { Colors } } = main;
	if (msg.suffix) {
		// Deal with it™️
		let randomWaitTimes = [1000, 1500, 3000, 2500, 2000, 1250, 500, 300, 100, 600];
		let randomAnswers = [
			{
				color: 0x43B581,
				answer: "It is certain",
			},
			{
				color: 0x43B581,
				answer: "It is decidedly so",
			},
			{
				color: 0x43B581,
				answer: "Without a doubt",
			},
			{
				color: 0x43B581,
				answer: "Yes, definitely",
			},
			{
				color: 0x43B581,
				answer: "You may rely on it",
			},
			{
				color: 0x43B581,
				answer: "As I see it, yes",
			},
			{
				color: 0x43B581,
				answer: "Most likely",
			},
			{
				color: 0x43B581,
				answer: "Outlook good",
			},
			{
				color: 0x43B581,
				answer: "Yes",
			},
			{
				color: 0x43B581,
				answer: "Signs point to yes",
			},
			{
				color: 0xE55B0A,
				answer: "Reply hazy try again",
			},
			{
				color: 0xE55B0A,
				answer: "Ask again later",
			},
			{
				color: 0xE55B0A,
				answer: "Better not tell you now",
			},
			{
				color: 0xE55B0A,
				answer: "Cannot predict now",
			},
			{
				color: 0xE55B0A,
				answer: "Concentrate and ask again",
			},
			{
				color: 0xCC0F16,
				answer: "Don't count on it",
			},
			{
				color: 0xCC0F16,
				answer: "My reply is no",
			},
			{
				color: 0xCC0F16,
				answer: "My sources say no",
			},
			{
				color: 0xCC0F16,
				answer: "Outlook not so good",
			},
			{
				color: 0xCC0F16,
				answer: "Very doubtful",
			},
		];
		const m = await msg.channel.send({
			embed: {
				color: Colors.BLUE,
				description: `Asking the 🎱 your question..`,
				footer: {
					text: `Please wait...`,
				},
			},
		});
		await PromiseWait(randomWaitTimes[Math.floor(Math.random() * randomWaitTimes.length)]);
		let randomChoice = randomAnswers[Math.floor(Math.random() * randomAnswers.length)];
		m.edit({
			embed: {
				description: `Our 🎱 replied with:\`\`\`css\n${randomChoice.answer}\`\`\``,
				color: randomChoice.color,
			},
		});
	} else {
		winston.verbose(`No suffix was provided for the "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id	});
		msg.channel.send({
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
