const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		let query = suffix.substring(0, suffix.lastIndexOf(" "));
		let num = suffix.substring(suffix.lastIndexOf(" ") + 1);
		if(!query || isNaN(num)) {
			query = suffix;
			num = serverDocument.config.command_fetch_properties.default_count;
		}
		if(num < 1 || num > serverDocument.config.command_fetch_properties.max_count) {
			num = serverDocument.config.command_fetch_properties.default_count;
		} else {
			num = parseInt(num);
		}
		const api_url = `https://kitsu.io/api/edge/anime?filter%5Btext%5D=${encodeURIComponent(query)}`;
		unirest.get(api_url).header("Accept", "application/vnd.api+json").end(res => {
			if(res.status==200 && res.body.data.length) {
				const results = [];
				const list = [];
				const getDisplay = data => {
					// Title + airing time
					let airing = data.attributes.startDate;
					if(data.attributes.endDate !== null) {
						airing += ` — ${data.attributes.endDate}`;
					}
					const info = [];
					info.push(`__**${data.attributes.canonicalTitle}**__ (${airing})`);
					// Link
					info.push(`https://kitsu.io/anime/${data.attributes.slug}`);
					// Status line
					if(data.attributes.averageRating) {
						info.push(`**Rating:** ${data.attributes.averageRating}%`);
					}
					if(data.attributes.ageRating) {
						info.push(`**Rated:** ${data.attributes.ageRating}`);
					}
					if(!data.attributes.episodeCount) {
						data.attributes.episodeCount = "N/A";
					}
					if(data.attributes.episodeLength) {
						info.push(`**Episodes:** ${data.attributes.episodeCount} @ ${data.attributes.episodeLength} mins`);
					} else {
						info.push(`**Episodes:** ${data.attributes.episodeCount}`);
					}
					info.push("");
					info.push(data.attributes.synopsis);
					return info.join("\n");
				};
				for(let i=0; i < num; i++) {
					const entry = res.body.data[i];
					if(entry) {
						results.push(getDisplay(entry));
						list.push(`${i}) ${entry.attributes.canonicalTitle}`);
					}
				}
				if(list.length == 1) {
					msg.channel.createMessage(results[0]);
				} else {
					msg.channel.createMessage(`Select one of the following:\n\t${list.join("\n\t")}`);
					bot.awaitMessage(msg.channel.id, msg.author.id, message => {
						message.content = message.content.trim();
						return message.content && !isNaN(message.content) && message.content>=0 && message.content<results.length;
					}, message => {
						msg.channel.createMessage(results[+message.content]);
					});
				}
			} else {
				winston.warn(`No anime found for '${query}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage("No anime found (˃̥̥ω˂̥̥̥)");
			}
		});
	} else {
		winston.warn(`Parameters not provided for '${commandData.name}' command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} You gotta give me somethin' to search for!`);
	}
};
