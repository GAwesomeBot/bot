const unirest = require("unirest");

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (suffix) {
		unirest.get(`http://api.duckduckgo.com/?format=json&q=${encodeURIComponent(suffix)}`).header("Accept", "application/json").end(res => {
			if (res.status === 200) {
				const data = JSON.parse(res.body);
				if (data.Results.length > 0 && data.AbstractText) {
					msg.channel.createMessage(`\`\`\`${data.AbstractText}\`\`\`${data.Results[0].FirstURL}`);
					return;
				}
			}
			winston.warn(`DuckDuckGo instant answer for "${suffix}" not found`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: "DuckDuckGo can't answer that. Maybe try Google? 😉",
					footer: {
						text: `That could mean there was an error searching that... You can try again if you want..`,
					},
				},
			});
		});
	} else {
		winston.warn(`Parameters not provided for "${commandData.name}" command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `Wtf am I supposed to do with nothing?`,
				footer: {
					text: `Please provide a question you'd want DuckDuckGo to answer..`,
				},
			},
		});
	}
};
