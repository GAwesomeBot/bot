const unirest = require("unirest");

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (suffix) {
		let query = suffix.substring(0, suffix.lastIndexOf(" "));
		let num = suffix.substring(suffix.lastIndexOf(" ") + 1);
		if (!query || isNaN(num)) {
			query = suffix;
			num = serverDocument.config.command_fetch_properties.default_count;
		}
		if (num < 1) {
			num = serverDocument.config.command_fetch_properties.default_count;
		} else if (num > serverDocument.config.command_fetch_properties.max_count) {
			num = serverDocument.config.command_fetch_properties.max_count;
		} else {
			num = parseInt(num);
		}
		const api_url = `https://kitsu.io/api/edge/anime?filter%5Btext%5D=${encodeURIComponent(query)}`;
		unirest.get(api_url).header("Accept", "application/vnd.api+json").end(async res => {
			if (res.status === 200 && res.body.data.length) {
				let results = [], list = [];
				const getDisplay = data => {
					// Title + airing time
					let airing = data.attributes.startDate;
					if (data.attributes.endDate !== null) {
						airing += ` — ${data.attributes.endDate}`;
					}
					let totalResult = "";
					if (data.attributes.averageRating) {
						totalResult += `Rating is ${data.attributes.averageRating}%`;
					}
					if (data.attributes.ageRating && data.attributes.averageRating) {
						totalResult += ` | Rated ${data.attributes.ageRating}`;
					} else {
						totalResult += `Rated ${data.attributes.ageRating}`;
					}
					if (!data.attributes.episodeCount) {
						data.attributes.episodeCount = "N/A";
					}
					if (data.attributes.episodeLength) {
						totalResult += ` | ${data.attributes.episodeCount} episodes, each lasting ${data.attributes.episodeLength} minutes.`;
					} else {
						totalResult += ` | ${data.attributes.episodeCount} episodes.`;
					}
					return {
						color: 0x00FF00,
						author: {
							name: `${data.attributes.canonicalTitle} (${airing})`,
							url: `https://kitsu.io/anime/${data.attributes.slug}`,
							icon_url: `${data.attributes.posterImage.tiny}`,
						},
						description: `${data.attributes.synopsis}`,
						footer: {
							text: `${totalResult}\nClick on the "Anime Name" to see the webpage!`,
						},
						image: {
							url: `${data.attributes.posterImage.original}`,
						},
					};
				};
				for (let i = 0; i < num; i++) {
					const entry = res.body.data[i];
					if (entry) {
						results.push(getDisplay(entry));
						list.push(`${i}) ${entry.attributes.canonicalTitle}`);
					}
				}
				if (list.length === 1) {
					msg.channel.createMessage({
						embed: results[0],
					});
				} else {
					let m = await msg.channel.createMessage({
						embed: {
							color: 0x9ECDF2,
							title: `Select one of the following:`,
							description: `${list.join("\n")}`,
						},
					});
					bot.awaitMessage(msg.channel.id, msg.author.id, message => {
						message.content = message.content.trim();
						return message.content && !isNaN(message.content) && message.content >= 0 && message.content < results.length;
					}, message => {
						try {
							message.delete();
						} catch (err) {
							// Ignore error
						}
						m.edit({
							embed: results[+message.content],
						});
					});
				}
			} else {
				winston.warn(`No anime found for '${query}'`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `No animu found... (˃̥̥ω˂̥̥̥)`,
						footer: {
							text: `P-please try again ${msg.author.username}-chan..!`,
						},
					},
				});
			}
		});
	} else {
		winston.warn(`Parameters not provided for "${commandData.name}" command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `${msg.author.username}-chan, you must give me an anime to search for!`,
			},
		});
	}
};
