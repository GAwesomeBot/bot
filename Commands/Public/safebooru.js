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

		unirest.get(`http://safebooru.donmai.us/posts.json?page=0&tags=${encodeURIComponent(query)}&limit=${num}`).headers({
			"Accept": "application/json",
			"User-Agent": "Unirest Node.js"
		}).end(res => {
			if(res.status==200) {
				const info = [];
				for(let i=0; i<res.body.length; i++) {
					info.push(`${res.body[i].description ? (`\`\`\`${res.body[i].description}\`\`\``) : ""}**Author:** ${res.body[i].uploader_name}\n**Rating:** ${res.body[i].rating.toUpperCase()}\n**Score:** ${res.body[i].score}\n**Favorites:** ${res.body[i].fav_count}\nhttp://safebooru.donmai.us${res.body[i].file_url}`);
				}
				bot.sendArray(msg.channel, info);
			} else {
				winston.warn(`No ${commandData.name} results found for '${query}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage("I'm so sorry, Safebooru has failed me 😥");
			}
		});
	} else {
		winston.warn(`Parameters not provided for '${commandData.name}' command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} You gotta give me somethin' to search for!`);
	}
};
