module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix) {
        let embed_fields = [];
        const getCommandHelp = (name, type, usage, description) => {
        	return {
        		name: `__Help for ${type} command **${name}**__`,
				value: `${description ? (`Description: ${description}\n`) : ""}${usage ? (`Usage: \`${usage}\`\n`) : ""}Click [here](https://github.com/GilbertGobbels/GAwesomeBot/wiki/Commands#${name}) for more info`,
				inline: true
			};
		};
        let pmCommand = bot.getPMCommandMetadata(suffix);
        if(pmCommand) {
        	embed_fields.push(getCommandHelp(suffix, "PM", pmCommand.usage))
		}
		let publicCommand = bot.getPublicCommandMetadata(suffix);
        if(publicCommand) {
        	embed_fields.push(getCommandHelp(suffix, "public", publicCommand.usage, publicCommand.description));
		}
		if(embed_fields.length == 0) {
        	embed_fields.push({
        		name: `Error`,
				value: `No such command \`${suffix}\``,
				inline: true
			});
		}
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x00FF00,
				fields: embed_fields
			}
		});
	} else {
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0x00FF00,
				description: `${msg.author.mention} Check your PMs.`
			}
		});
		let description = `You can use the following commands in public chat on ${msg.channel.guild.name} with the prefix \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}\`.\n\tSome commands might not be shown because you don't have permission to use them or they've been disabled by a server admin.\nFor a list of commands you can use in private messages with me, respond to this message with \`help\`. 👌\n\tFor detailed information about each command and all of GAwesomeBot's other features, head over to our wiki [here](https://github.com/GilbertGobbels/GAwesomeBot/wiki/Commands).\n\tIf you need support using GAwesomeBot, please join our Discord server [here](${config.discord_link}). Have fun! 🙂🐬`;
		const commands = {};
		const memberBotAdmin = bot.getUserBotAdmin(msg.channel.guild, serverDocument, msg.member);
		bot.getPublicCommandList().forEach(command => {
			if(serverDocument.config.commands[command] && serverDocument.config.commands[command].isEnabled && memberBotAdmin >= serverDocument.config.commands[command].admin_level) {
				const commandData = bot.getPublicCommandMetadata(command);
				if(!commands[commandData.category]) {
					commands[commandData.category] = [];
				}
				commands[commandData.category].push(`${command} ${commandData.usage}`);
			}
		});
        msg.author.getDMChannel().then(ch => {
            ch.createMessage({
                embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
                    description: description
                }
            });
        });
		Object.keys(commands).sort().forEach(category => {
			msg.author.getDMChannel().then(ch => {
                ch.createMessage({
                    embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
                        title: `**${category}**`,
                        description: `\`\`\`css\n${commands[category].sort().join("\n")}\`\`\``
                    }
                });
			});
		});

	}
};
