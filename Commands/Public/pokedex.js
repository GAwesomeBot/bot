const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		unirest.get(`http://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(suffix.toLowerCase())}`).header("Accept", "application/json").end(res => {
			if(res.status == 200 && res.body) {
				let embed_fields = [];
				if(res.body.gender_rate == -1) {
					embed_fields.push({
						name: `**Gender:**`,
						value: `Genderless`,
						inline: true
					});
				} else {
					embed_fields.push({
						name: `**Gender Ratio:**`,
						value: `${(res.body.gender_rate / 8) * 100}% female and ${((8 - res.body.gender_rate) / 8) * 100}% male`,
						inline: true
					});
				}
				embed_fields.push({
					name: `**Capture Rate:**`,
					value: `${res.body.capture_rate} of 255 (higher is better)`,
					inline: true
				});
				embed_fields.push({
					name: `**Base Happiness:**`,
					value: `${res.body.base_happiness}`,
					inline: true
				});
				embed_fields.push({
					name: `**Base Steps to Hatch:**`,
					value: `${res.body.hatch_counter * 255 + 1}`,
					inline: true
				});
				embed_fields.push({
					name: `**Growth Rate:**`,
					value: `${res.body.growth_rate.name}`,
					inline: true
				});
				embed_fields.push({
					name: `**Color / Shape:**`,
					value: `${res.body.color.name} ${res.body.shape.name}`,
					inline: true
				});
				embed_fields.push({
					name: `**Habitat:**`,
					value: `${res.body.habitat ? res.body.habitat.name : "None"}`,
					inline: true
				});
				embed_fields.push({
					name: `**First Seen in Generation:**`,
					value: `${res.body.generation.name.substring(res.body.generation.name.indexOf("-") + 1).toUpperCase()}`,
					inline: true
				});
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0x00FF00,
						title: `__Pokemon #${res.body.id}: ${res.body.names[0].name}__`,
						fields: embed_fields
					}
				});
			} else {
				winston.warn(`No Pokedex data found for \`${suffix}\``, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						description: "Something happened...RIP in pieces."
					}
				});
			}
		});
	} else {
		winston.warn(`Parameters not provided for '${commandData.name}' command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage({
			embed: {
                author: {
                    name: bot.user.username,
                    icon_url: bot.user.avatarURL,
                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                },
                color: 0xFF0000,
				description: `:speak_no_evil: :writing_hand: :1234:`
			}
		});
	}
};
