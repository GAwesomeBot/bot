const unirest = require("unirest");

/* eslint-disable max-len */
module.exports = async (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (suffix) {
		const m = await msg.channel.createMessage({
			embed: {
				color: 0x9ECDF2,
				title: `The 🎱 is thinking...`,
				description: `Please wait...`,
			},
		});
		unirest.get(`https://8ball.delegator.com/magic/JSON/${encodeURIComponent(suffix)}`).header("Accept", "application/json").end(res => {
			if (res.status === 200) {
				m.edit({
					embed: {
						color: 0x00FF00,
						title: `The 🎱 replied with:`,
						description: `\`\`\`${res.body.magic.answer}\`\`\``,
					},
				});
			} else {
				winston.error(`Failed to fetch 8ball answer, API returned ${res.status}`, { svrid: msg.channel.guild.id, chid: msg.channel.id });
				m.edit({
					embed: {
						color: 0xFF0000,
						description: "Broken 🎱. 😕",
						footer: {
							text: `Try again! Maybe I forgot how to use the 8Ball...`,
						},
					},
				});
			}
		});
	} else {
		winston.warn(`Parameters not provided for "${commandData.name}" command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				description: `You tell me... 😜`,
				color: 0xFF0000,
				footer: {
					text: "You should provide a question, so that I can provide an answer!",
				},
			},
		});
	}
};
