module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix) {
		const getCommandHelp = (name, type, usage, description) => {
			return `__Help for ${type} command **${name}**__\n${description ? (`Description: ${description}\n`) : ""}${usage ? (`Usage: \`${usage}\`\n`) : ""}<https://awesomebot.xyz/wiki/Commands#${name}>`;
		};

		const info = [];
		const pmcommand = bot.getPMCommandMetadata(suffix);
		if(pmcommand) {
			info.push(getCommandHelp(suffix, "PM", pmcommand.usage));
		}
		const publiccommand = bot.getPublicCommandMetadata(suffix);
		if(publiccommand) {
			info.push(getCommandHelp(suffix, "public", publiccommand.usage, publiccommand.description));
		}
		if(info.length==0) {
			info.push(`No such command \`${suffix}\``);
		}
		bot.sendArray(msg.channel, info);
	} else {
		msg.channel.createMessage(`${msg.author.mention} Check your PMs.`);

		const info = [`You can use the following commands in public chat on ${msg.guild.name} with the prefix \`${bot.getCommandPrefix(msg.guild, serverDocument)}\`. Some commands might not be shown because you don't have permission to use them or they've been disabled by a server admin. For a list of commands you can use in private messages with me, respond to this message with \`help\`. 👌`];
		const commands = {};
		const memberBotAdmin = bot.getUserBotAdmin(msg.guild, serverDocument, msg.member);
		bot.getPublicCommandList().forEach(command => {
			if(serverDocument.config.commands[command] && serverDocument.config.commands[command].isEnabled && memberBotAdmin>=serverDocument.config.commands[command].admin_level) {
				const commandData = bot.getPublicCommandMetadata(command);
				if(!commands[commandData.category]) {
					commands[commandData.category] = [];
				}
				commands[commandData.category].push(`${command} ${commandData.usage}`);
			}
		});
		Object.keys(commands).sort().forEach(category => {
			info.push(`**${category}**\`\`\`${commands[category].sort().join("\n")}\`\`\``);
		});
		info.push(`For detailed information about each command and all of AwesomeBot's other features, head over to our wiki: <https://awesomebot.xyz/wiki/Commands>. If you need support using AwesomeBot, please join our Discord server: <${config.discord_link}>. Have fun! 🙂🐬`);

		msg.author.getDMChannel().then(ch => {
			bot.sendArray(ch, info);
		});
	}
};
