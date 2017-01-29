const util = require("util");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix) {
		try {
			let result = eval(suffix);
			if(typeof(result) == "object") {
				result = util.inspect(result);
			}
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0x00FF00,
					title: "Eval Result",
					description: `\`\`\`${result}\`\`\``
				}
			});
		} catch(err) {
			msg.channel.createMessage({
				embed: {
                    author: {
                        name: bot.user.username,
                        icon_url: bot.user.avatarURL,
                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                    },
                    color: 0xFF0000,
					title: "Eval Result",
					description: `\`\`\`${err}\`\`\``
				}
			});
		}
	}
};
