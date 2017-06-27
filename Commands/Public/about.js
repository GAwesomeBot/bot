/* eslint-disable max-len */
/* eslint-disable prefer-template */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if (suffix && ["bug", "suggestion", "feature", "issue", "request", "report"].includes(suffix.toLowerCase())) {
		msg.channel.createMessage({
			embed: {
				color: 0x9ECDF2,
				description: `Please file your \`${suffix.toLowerCase()}\` [here](https://github.com/GilbertGobbels/GAwesomeBot/issues) ${(["bug", "issue", "report"].contains(suffix.toLowerCase()) ? "🐜" : "")}`,
			},
		});
	} else {
		msg.channel.createMessage({
			embed: {
				color: 0x00FF00,
				title: `Hello! I'm __${bot.user.username}__, the best Discord Bot! 🐬`,
				description: `Created by GG142, King - Vlad, HilbertGilbertson, and the community ❤.\nBuilt on NodeJS and Eris\nGo [here](${config.hosting_url}) to learn more${(config.discord_link ? ", or join our Discord server [here](" + config.discord_link + ")" : ".")}\nYou can go [here](https://github.com/GilbertGobbels/GAwesomeBot/) to check out the code, make suggestions or report bugs!`,
				footer: {
					text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}help" to list all the commands that you can use on this server.`,
				},
			},
		});
	}
};
