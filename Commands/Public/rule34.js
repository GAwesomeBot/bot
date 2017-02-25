const unirest = require("unirest");
const xmlparser = require("xml-parser");

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

		unirest.get(`http://rule34.xxx/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(query)}&limit=${num}`).end(res => {
			if(res.status==200) {
				res.body = xmlparser(res.body).root.children;
				const info = [];
				for(let i=0; i<res.body.length; i++) {
					info.push(`**Rating:** ${res.body[i].attributes.rating.toUpperCase()}\n**Score:** ${res.body[i].attributes.score}\nhttp:${res.body[i].attributes.file_url}`);
				}
				bot.sendArray(msg.channel, info);
			} else {
				winston.warn(`No ${commandData.name} results found for '${query}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage("I'm so sorry, rule34 has failed me 😥");
			}
		});
	} else {
		winston.warn(`Parameters not provided for '${commandData.name}' command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage(`${msg.author.mention} You gotta give me somethin' to search for!`);
	}
};
