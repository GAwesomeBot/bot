module.exports = (bot, db, config, winston, userDocument, msg) => {
	const info = bot.getPMCommandList().map(command => {
		return `${command} ${bot.getPMCommandMetadata(command).usage}`;
	}).sort();
	msg.channel.createMessage({
		embed: {
			author: {
				name: bot.user.username,
				icon_url: bot.user.avatarURL,
				url: "https://github.com/GilbertGobbels/GAwesomeBot"
			},
			color: 0x9ECDF2,
			title: "You can use these commands in PM with me: 🍪",
			description: `\`\`\`${info.join("\n")}\`\`\`Learn more [here](${config.hosting_url}wiki) 📘`
		}
	});
};
