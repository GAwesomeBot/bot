const getGIF = require("./../../Modules/GiphySearch.js");

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (suffix) {
		getGIF(suffix, serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.isEnabled && !serverDocument.config.moderation.filters.nsfw_filter.disabled_channel_ids.includes(msg.channel.id) ? "pg-13" : "r", data => {
			if (data.id) {
				let url_base = `http://media2.giphy.com/media/${data.id}/giphy.gif`;
				msg.channel.createMessage({
					embed: {
						color: 0x00FF00,
						author: {
							name: `Your "${suffix}" gif is here (Click here for the direct URL)`,
							url: url_base,
						},
						image: {
							url: url_base,
						},
					},
				});
			} else {
				winston.warn(`No GIFs found for "${suffix}" search`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `The Internet has run out of memes (╯°□°）╯︵ ┻━┻ or I was unable to find that GIF!`,
						footer: {
							text: `Try again, with a different query!`,
						},
					},
				});
			}
		});
	} else {
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `How am I able to guess what GIF you want?`,
				footer: {
					text: `Please use the syntax "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <gif to search>"`,
				},
			},
		});
	}
};
