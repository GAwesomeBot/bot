const nsfwWords = require("../../Configurations/filter.json");

// Check if a message contains a filtered string, and whether filtering is enabled
/* eslint-disable max-len */
module.exports = (serverDocument, channel, string, isNsfw, isCustom, nsfwOverride) => {
	if (serverDocument.config.moderation.isEnabled) {
		if (isNsfw && serverDocument.config.moderation.filters.nsfw_filter.isEnabled &&	!serverDocument.config.moderation.filters.nsfw_filter.disabled_channel_ids.includes(channel.id)) {
			if (nsfwOverride) return true;

			for (let i = 0; i < nsfwWords.length; i++) {
				if (` ${string} `.toLowerCase().includes(` ${nsfwWords[i]} `)) {
					return true;
				}
			}
		} else if (isCustom && serverDocument.config.moderation.filters.custom_filter.isEnabled && !serverDocument.config.moderation.filters.custom_filter.disabled_channel_ids.includes(channel.id)) {
			for (let i = 0; i < serverDocument.config.moderation.filters.custom_filter.keywords.length; i++) {
				if (` ${string} `.toLowerCase().includes(` ${serverDocument.config.moderation.filters.custom_filter.keywords[i]} `)) {
					return true;
				}
			}
		}
	}
	return false;
};
