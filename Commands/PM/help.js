module.exports = (bot, db, config, winston, userDocument, msg) => {
	const info = bot.getPMCommandList().map(command => {
		return `${command} ${bot.getPMCommandMetadata(command).usage}`;
	}).sort();
	msg.channel.createMessage(`You can use these commands in PM with me: 🍪\`\`\`${info.join("\n")}\`\`\`Learn more at <https://awesomebot.xyz/wiki> 📘`);
};
