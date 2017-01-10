const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		unirest.get(`http://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(suffix.toLowerCase())}`).header("Accept", "application/json").end(res => {
			if(res.status==200 && res.body) {
				let info = `__Pokemon #${res.body.id}: ${res.body.names[0].name}__\n`;
				if(res.body.gender_rate==-1) {
					info += "**Genderless**\n";
				} else {
					info += `**Gender Ratio:** ${(res.body.gender_rate / 8) * 100}% female and ${((8 - res.body.gender_rate) / 8) * 100}% male\n`;
				}
				info += `**Capture Rate:** ${res.body.capture_rate} of 255 (higher is better)\n**Base Happiness:** ${res.body.base_happiness}\n**Base Steps to Hatch:** ${res.body.hatch_counter * 255 + 1}\n**Growth Rate:** ${res.body.growth_rate.name}\n**Color/Shape:** ${res.body.color.name} ${res.body.shape.name}\n**Habitat:** ${res.body.habitat ? res.body.habitat.name : "None"}\n**First Seen in Generation:** ${res.body.generation.name.substring(res.body.generation.name.indexOf("-")+1).toUpperCase()}`;
				msg.channel.createMessage(info);
			} else {
				winston.warn(`No Pokedex data found for \`${suffix}\``, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage("Something happened...RIP in pieces.");
			}
		});
	} else {
		winston.warn(`Parameters not provided for '${commandData.name}' command`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} :speak_no_evil: :writing_hand: :1234:`);
	}
};
