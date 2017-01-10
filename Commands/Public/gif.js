const getGIF = require("./../../Modules/GiphySearch.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	getGIF(suffix, (serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.disabled_channel_ids.indexOf(msg.channel.id)==-1) ? "pg-13" : "r", function(url) {
		if(url) {
			msg.channel.createMessage(url);
		} else {
			winston.warn(`No GIFs found for '${suffix}'`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage("The Internet has run out of memes (╯°□°）╯︵ ┻━┻");
		}
	});
};
