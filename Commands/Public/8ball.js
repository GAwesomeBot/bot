/**
 * 8ball!
 */
const request = require("snekfetch");

module.exports = async (main, documents, msg, suffix, commandData) => {
	if (suffix) {
		const m = await msg.channel.send({
			embed: {
				color: 0x3669FA,
				description: `Asking the 🎱 your question..`,
				footer: {
					text: `Please wait...`,
				},
			},
		});
		const res = await request.get(`https://8ball.delegator.com/magic/JSON/${encodeURIComponent(suffix)}`).set("Accept", "application/json");
		if (res.status === 200) {
			m.edit({
				embed: {
					color: 0x00FF00,
					title: `Our 🎱 replied with...`,
					description: `\`\`\`css\n${res.body.magic.answer}\`\`\``,
					footer: {
						text: `This answers type is "${res.body.magic.type}". Interesting..`,
					},
				},
			});
		} else {
			winston.verbose(`Failed to get 8ball answer, API returned "${res.status}"`, { svrid: msg.channel.guild.id, chid: msg.channel.id, statusText: res.statusText });
			m.edit({
				embed: {
					color: 0xFF0000,
					description: `Dang.. I think our 🎱 broke.. 😞`,
					footer: {
						text: `You can try again! Maybe our 8ball fell asleep..`,
					},
				},
			});
		}
	} else {
		winston.verbose(`No suffix was provided for the "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id	});
		msg.channel.send({
			embed: {
				color: 0xFF0000,
				description: `You tell me... 😜`,
				footer: {
					text: `Psst. You need to ask the 8ball a question, ya'know?`,
				},
			},
		});
	}
};
