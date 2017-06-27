const auth = require("./../../Configuration/auth.json");
const unirest = require("unirest");
const google = require("google");

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (suffix) {
		let query = suffix.substring(0, suffix.lastIndexOf(" "));
		let num = suffix.substring(suffix.lastIndexOf(" ") + 1);
		if (!query || isNaN(num)) {
			query = suffix;
			num = 0;
		}
		if (num < 0) {
			num = 0;
		} else if (num > serverDocument.config.command_fetch_properties.max_count) {
			num = serverDocument.config.command_fetch_properties.max_count;
		} else {
			num = parseInt(num);
		}
		const doSearch = () => {
			google(query, (err, res) => {
				if (err || res.links.length === 0) {
					winston.warn(`No Google search results found for "${query}"`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
					msg.channel.createMessage({
						embed: {
							color: 0xFF0000,
							description: `No results were found! 🙅`,
							footer: {
								text: `Try searching with a different query!`,
							},
						},
					});
				} else {
					let results = [];
					if (num === 0) {
						num = 1;
					}
					for (let i = 0; i < Math.min(res.links.length, num); i++) {
						if ([`News for ${query}`, `Images for ${query}`].indexOf(res.links[i].title) > -1) {
							res.links.splice(i, 1);
							i--;
							continue;
						}
						results.push({
							color: 0x00FF00,
							author: {
								name: res.links[i].title,
								url: res.links[i].href,
							},
							description: `${res.links[i].description} Read more [here](${res.links[i].href})`,
						});
					}
					for (let i = 0; i < results.length; i++) {
						msg.channel.createMessage({ embed: results[i] });
					}
				}
			});
		};
		const apiURL = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&key=${serverDocument.config.custom_api_keys.google_api_key || auth.tokens.google_api_key}&limit=1&indent=True`;
		unirest.get(apiURL).header("Accept", "application/json").end(res => {
			if (res.status === 200 && res.body.itemListElement[0] && res.body.itemListElement[0].result && res.body.itemListElement[0].result.detailedDescription) {
				msg.channel.createMessage({
					embed: {
						author: {
							name: res.body.itemListElement[0].result.name,
							url: res.body.itemListElement[0].result.detailedDescription.url,
						},
						title: res.body.itemListElement[0].result.description,
						thumbnail: {
							url: res.body.itemListElement[0].result.image.contentUrl,
						},
						description: `${res.body.itemListElement[0].result.detailedDescription.articleBody}`,
						color: 0x00FF00,
						footer: {
							text: `Read more at "${res.body.itemListElement[0].result.url}"`,
						},
					},
				});
				if (num > 0) {
					doSearch();
				}
			} else {
				doSearch();
			}
		});
	} else {
		winston.warn(`Parameters not provided for "${commandData.name}" command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `I need something to search for, just saying. 🙄`,
			},
		});
	}
};
