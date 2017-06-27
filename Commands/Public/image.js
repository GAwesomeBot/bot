const giSearch = require("./../../Modules/GoogleImageSearch.js");

// Get a random integer in specified range, inclusive
/* eslint-disable arrow-body-style, max-len */
const getRandomInt = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (suffix) {
		let start;
		if (suffix.substring(suffix.lastIndexOf(" ") + 1).toLowerCase() === "random" && suffix.substring(0, suffix.lastIndexOf(" "))) {
			suffix = suffix.substring(0, suffix.lastIndexOf(" "));
			start = getRandomInt(0, 19);
		}
		giSearch(serverDocument, suffix, serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.disabled_channel_ids.indexOf(msg.channel.id) === -1, start, url => {
			if (url === 403) {
				return msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `Looks like we've hit the daily Google Image Search API Rate Limit, folks! Sorry about that!`,
						footer: {
							text: `You can go to this server's admin panel and place your own Google Image API Key under "API Keys".`,
						},
					},
				});
			} else if (url) {
				return msg.channel.createMessage({
					embed: {
						image: {
							url: url,
						},
						color: 0x00FF00,
					},
				});
			} else {
				winston.warn(`No images found for "${suffix}"`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `Couldn't find anything, sorry.. 😧`,
						footer: {
							text: `Maybe you should try searching something else, hopefully I'll find what you want!`,
						},
					},
				});
			}
		});
	} else {
		winston.warn(`Parameters not provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `I don't know what image to get... 😯`,
				footer: {
					text: `I can find you almost any image, but you must let me know what i should search before..`,
				},
			},
		});
	}
};
