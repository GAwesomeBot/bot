const nsfwFilter = require("./../Configuration/filter.json");

// Check if a message contains a filtered string, and whether filtering is enabled
module.exports = function (serverDocument, ch, str, isNsfw, isCustom, nsfwOverride) {
	if(serverDocument.config.moderation.isEnabled) {
		if(isNsfw && serverDocument.config.moderation.filters.nsfw_filter.isEnabled && serverDocument.config.moderation.filters.nsfw_filter.disabled_channel_ids.indexOf(ch.id)==-1) {
			if(nsfwOverride) {
				return true;
			}
			for(let i=0; i<nsfwFilter.length; i++) {
				if((` ${str} `).toLowerCase().indexOf(` ${nsfwFilter[i]} `)>-1) {
					return true;
				}
			}
		} else if(isCustom && serverDocument.config.moderation.filters.custom_filter.isEnabled && serverDocument.config.moderation.filters.custom_filter.disabled_channel_ids.indexOf(ch.id)==-1) {
			for(let i=0; i<serverDocument.config.moderation.filters.custom_filter.keywords.length; i++) {
				if((` ${str} `).toLowerCase().indexOf(` ${serverDocument.config.moderation.filters.custom_filter.keywords[i]} `)>-1) {
					return true;
				}
			}
		}
	}
	return false;
};
