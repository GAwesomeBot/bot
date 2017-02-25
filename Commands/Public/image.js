const giSearch = require("./../../Modules/GoogleImageSearch.js");

// Get a random integer in specified range, inclusive
const getRandomInt = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		let start;
		if(suffix.substring(suffix.lastIndexOf(" ") + 1).toLowerCase() == "random" && suffix.substring(0, suffix.lastIndexOf(" "))) {
			suffix = suffix.substring(0, suffix.lastIndexOf(" "));
			start = getRandomInt(0, 19);
		}
		giSearch(serverDocument, suffix, serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.disabled_channel_ids.indexOf(msg.channel.id)==-1, start, url => {
			if(url == 403) {
				msg.channel.createMessage("Looks like we've hit the daily Google Image Search API rate limit, folks! Sorry about that."); // TODO: link to wiki here
			} else if(url) {
				msg.channel.createMessage(url);
			} else {
				winston.warn(`No images found for '${suffix}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage("Couldn't find anything, sorry 😧");
			}
		});
	} else {
		winston.warn(`Parameters not provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} I don't know what image to get... 😯`);
	}
};
