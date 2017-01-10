const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		let query = suffix.substring(0, suffix.lastIndexOf(" "));
		let num = suffix.substring(suffix.lastIndexOf(" ")+1);

		if(!query || isNaN(num)) {
			query = suffix;
			num = serverDocument.config.command_fetch_properties.default_count;
		}
		if(num<1 || num>serverDocument.config.command_fetch_properties.max_count) {
			num = serverDocument.config.command_fetch_properties.default_count;
		} else {
			num = parseInt(num);
		}

		const api_url = `http://hummingbird.me/api/v1/search/anime?query=${encodeURIComponent(query)}`;
		unirest.get(api_url).header("Accept", "application/json").end(res => {
			if(res.status==200 && res.body.length) {
				const results = [];
				const list = [];

				const getDisplay = data => {
					// Title + airing time
					let airing = data.started_airing;
					if(data.show_type=="TV") {
						airing += ` — ${data.finished_airing || "*ongoing*"}`;
					}

					const info = [];
					info.push(`__**${data.title}**__ (${airing})`);

					// Link
					info.push(data.url);

					// Status line
					if(data.community_rating) {
						info.push(`**Rating:** ${data.community_rating.toFixed(2)}/5`);
					}
					if(data.age_rating) {
						info.push(`**Rated:** ${data.age_rating}`);
					}

					if(!data.episode_count) {
						data.episode_count = "N/A";
					}
					if(data.episode_length) {
						info.push(`**Episodes:** ${data.episode_count} @ ${data.episode_length} mins`);
					} else {
						info.push(`**Episodes:** ${data.episode_count}`);
					}

					// Genres
					const genres = data.genres.map(genre => genre.name);
					if(genres.length) {
						info.push(`**Genre:** ${genres.join(", ")}`);
					}

					info.push("");
					info.push(data.synopsis);

					return info.join("\n");
				};

				for(let i=0; i<num; i++) {
					const entry = res.body[i];
					if(entry) {
						results.push(getDisplay(entry));
						list.push(`${i}) ${entry.title}`);
					}
				}

				if(list.length==1) {
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
				winston.warn(`No anime found for '${query}'`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage("No anime found (˃̥̥ω˂̥̥̥)");
			}
		});
	} else {
		winston.warn(`Parameters not provided for '${commandData.name}' command`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} You gotta give me somethin' to search for!`);
	}
};
