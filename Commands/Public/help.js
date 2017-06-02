/* eslint-disable max-len */
/* eslint-disable arrow-body-style */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if (suffix) {
		let fields = [];
		const getCommandHelp = (name, type, usage, description) => {
			const fieldValue = `${description ? `Description: ${description}` : "No description provided."}\n${usage ? `Usage: \`${usage}\`` : "No usage information provided."}\n${type === "extension" ? "" : `Click [here](https://github.com/GilbertGobbels/GAwesomeBot/wiki/Commands#${name}) for more info`}`;
			return {
				name: `Help for __${type}__ command __${name}__`,
				value: fieldValue,
				inline: false,
			};
		};
		let pmCommand = bot.getPMCommandMetadata(suffix);
		if (pmCommand) {
			fields.push(getCommandHelp(suffix, "PM", pmCommand.usage, pmCommand.description ? pmCommand.description : null));
		}
		let publicCommand = bot.getPublicCommandMetadata(suffix);
		if (publicCommand) {
			fields.push(getCommandHelp(suffix, "public", publicCommand.usage, publicCommand.description));
		}
		for (let i = 0; i < serverDocument.extensions.length; i++) {
			if (serverDocument.extensions[i].type === "command" && suffix.toLowerCase() === serverDocument.extensions[i].key) {
				fields.push(getCommandHelp(suffix, "extension", serverDocument.extensions[i].usage_help, serverDocument.extensions[i].extended_help));
			}
		}
		if (fields.length === 0) {
			fields.push({
				name: `Error`,
				value: `There isn't a command called \`${suffix}\`... Did you mistype?`,
				inline: false,
			});
		}
		msg.channel.createMessage({
			embed: {
				color: 0x00FF00,
				fields: fields,
				footer: {
					text: `Not what you were looking for? Try running ${bot.getCommandPrefix(msg.channel.guild, serverDocument)}help`,
				},
			},
		});
	} else {
		msg.channel.createMessage({
			embed: {
				color: 0x00FF00,
				description: `You should check your PMs!`,
				footer: {
					text: `I've sent you the help message.`,
				},
			},
		});
		const commands = {};
		commands.Extensions = [];
		const memberBotAdmin = bot.getUserBotAdmin(msg.channel.guild, serverDocument, msg.member);
		bot.getPublicCommandList().forEach(command => {
			if (serverDocument.config.commands[command] && serverDocument.config.commands[command].isEnabled && memberBotAdmin >= serverDocument.config.commands[command].admin_level) {
				const commandData = bot.getPublicCommandMetadata(command);
				if (!commands[commandData.category]) {
					commands[commandData.category] = [];
				}
				commands[commandData.category].push(`${command} | ${commandData.usage ? commandData.usage : "No usage help has been provided."}`);
			}
		});
		for (let i = 0; i < serverDocument.extensions.length; i++) {
			if (memberBotAdmin >= serverDocument.extensions[i].admin_level) {
				if (serverDocument.extensions[i].type === "command") {
					commands.Extensions.push(`${serverDocument.extensions[i].key} | ${serverDocument.extensions[i].usage_help ? serverDocument.extensions[i].usage_help : "No usage help has been provided."}`);
				}
			}
		}
		let fields = [];
		Object.keys(commands).sort().forEach(category => {
			fields.push({
				name: `**${category}**`,
				value: `\`\`\`css\n${commands[category].sort().join("\n")}\`\`\``,
				inline: false,
			});
		});
		msg.author.getDMChannel().then(ch => {
			ch.createMessage({
				embed: {
					color: 0x00FF00,
					fields: fields,
					author: {
						name: `You can use the following commands in public chat on ${msg.channel.guild.name} with the prefix "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}"`,
					},
					footer: {
						text: `For a list of commands you can use in private messages with me, respond to this message with "help". 👌`,
					},
					title: `Some commands might not be shown because you don't have permission to use them or they've been disabled by a server admin.`,
					description: `For detailed information about each command and all of GAwesomeBot's other features, head over to our wiki [here](https://github.com/GilbertGobbels/GAwesomeBot/wiki/Commands).\nIf you need support using GAwesomeBot, please join our Discord server [here](${config.discord_link}). Have fun! 🙂🐬`,
				},
			});
		});
	}
};
