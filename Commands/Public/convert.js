const convert = require("convert-units");
const fx = require("money");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const args = suffix.split(" ");
	if(args.length == 4 && args[2].toLowerCase() == "to") {
		args.splice(2, 1);
	}
	if(args.length == 3 && args[0] && !isNaN(args[0]) && args[1] && args[2]) {
		try {
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
					title: "Conversion Result:",
					description: `${Math.round(convert(args[0]).from(args[1]).to(args[2]) * 1000) / 1000} ${args[2]}`
				}
			});
		} catch(err) {
			try {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						title: "Conversion Result",
						description: `${(Math.round(fx(parseFloat(args[0])).from(args[1].toUpperCase()).to(args[2].toUpperCase())) * 100) / 100} ${args[2].toUpperCase()}`
					}
				});
			} catch(err) {
				winston.warn(`Unsupported conversion units '${args[1]}' and '${args[2]}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						description: `I don't support that unit, please try something else ↩. You can use standard currency codes or any of [these](https://github.com/ben-ng/convert-units#supported-units)`
					}
				});
			}
		}
	} else {
		winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0xFF0000,
				description: `Huh? Make sure to use the syntax \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}\``
			}
		});
	}
};
