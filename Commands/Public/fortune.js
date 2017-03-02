const unirest = require("unirest");

module.exports = function fortune(bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) {
	const categories = ["all", "computers", "cookie", "definitions", "miscellaneous", "people", "platitudes", "politics", "science", "wisdom"];
	if(suffix) {
        let category_suffix = suffix.trim().toLowerCase();
        if(categories.includes(category_suffix)) {
            unirest.get(`http://yerkee.com/api/fortune/${category_suffix}`).headers("Accept", "application/json").end(res => {
                if(res.status == 200) {
                    msg.channel.createMessage({
                        embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
							title: `The Fortune Machine says:`,
                            color: 0x00FF00,
                            description: res.body.fortune
                        }
                    });
                } else {
                    winston.warn("Failed to fetch fortune", {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
                    msg.channel.createMessage({
                    	embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0xFF0000,
                            title: `The Fortune Machine says:`,
							description: "I honestly don't know 😐"
						}
					});
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
                    color: 0xFF0000,
                    title: `The Fortune Machine says:`,
                    description: `**${category_suffix}** isn't part of the available categories. Please use one of these categories: \`\`\`css\n${categories.join(", ")}\`\`\``
                }
            });
        }
	} else {
		unirest.get(`http://yerkee.com/api/fortune/${suffix}`).headers("Accept", "application/json").end(res => {
			if(res.status == 200) {
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
                        title: `The Fortune Machine says:`,
						description: res.body.fortune
					}
				});
			} else {
				winston.warn("Failed to fetch fortune", {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
                msg.channel.createMessage({
                    embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
                        title: `The Fortune Machine says:`,
                        description: "I honestly don't know 😐"
                    }
                });
			}
		});
	}
};
