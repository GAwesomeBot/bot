module.exports = async ({ bot, configJS, Constants: { Colors } }, msg, commandData) => {
	const info = bot.getPMCommandList()
		.map(command => `${command} ${bot.getPMCommandMetadata(command).usage}`).sort();
	msg.reply({
		embed: {
			color: Colors.BLUE,
			title: `Here are the PM commands you can use ~~--~~ Learn more by clicking here 📘`,
			url: `${configJS.hostingURL}wiki`,
			description: `\`\`\`${info.join("\n")}\`\`\``,
		},
	});
};
