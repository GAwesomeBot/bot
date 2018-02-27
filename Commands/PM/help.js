module.exports = async ({ client, configJS, Constants: { Colors } }, msg, commandData) => {
	const info = client.getPMCommandList()
		.map(command => `${command} ${client.getPMCommandMetadata(command).usage}`).sort();
	msg.reply({
		embed: {
			color: Colors.BLUE,
			title: `Here are the PM commands you can use ~~--~~ Learn more by clicking here 📘`,
			url: `${configJS.hostingURL}wiki`,
			description: `\`\`\`${info.join("\n")}\`\`\``,
		},
	});
};
