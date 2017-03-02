const auth = require("./../../Configuration/auth.json");
const unirest = require("unirest");
const google = require("google");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		let query = suffix.substring(0, suffix.lastIndexOf(" "));
		let num = suffix.substring(suffix.lastIndexOf(" ") + 1);
		if(!query || isNaN(num)) {
			query = suffix;
			num = 0;
		}
		if(num < 0 || num > serverDocument.config.command_fetch_properties.max_count) {
			num = 0;
		} else {
			num = parseInt(num);
		}
		unirest.get(`https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&key=${serverDocument.config.custom_api_keys.google_api_key || auth.tokens.google_api_key}&limit=1&indent=True`).header("Accept", "application/json").end(res => {
			const doSearch = () => {
				google(query, (err, res) => {
					if(err || res.links.length == 0) {
						winston.warn(`No Google search results found for '${query}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
						msg.channel.createMessage("🙅 No results!");
					} else {
						const results = [];
						if(num == 0) {
							num = 1;
						}
						for(let i=0; i < Math.min(res.links.length, num); i++) {
							if([`News for ${query}`, `Images for ${query}`].indexOf(res.links[i].title)>-1) {
								res.links.splice(i, 1);
								i--;
								continue;
							}
							results.push(`**${res.links[i].title}**\n${res.links[i].description}\n<${res.links[i].href}>`);
						}
						bot.sendArray(msg.channel, results);
					}
				});
			};
			
			if(res.status == 200 && res.body.itemListElement[0] && res.body.itemListElement[0].result && res.body.itemListElement[0].result.detailedDescription) {
				msg.channel.createMessage(`\`\`\`${res.body.itemListElement[0].result.detailedDescription.articleBody}\`\`\`<${res.body.itemListElement[0].result.detailedDescription.url}>`).then(() => {
					if(num > 0) {
						doSearch();
					}
				});
			} else {
				doSearch();
			}
		});
	} else {
		winston.warn(`Parameters not provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} ❓❓❓`);
	}
};
