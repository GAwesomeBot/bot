const mathjs = require("mathjs");
const TimeTaken = require("./../../Modules/TimeTaken.js");

/* eslint-disable max-len */
module.exports = async (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (suffix) {
		let m = await msg.channel.createMessage({
			embed: {
				color: 0x9ECDF2,
				description: "Calculating...",
				footer: {
					text: `This shouldn't take long!`,
				},
			},
		});
		try {
			let result = mathjs.eval(suffix);
			let timeTaken = TimeTaken(m, msg);
			m.edit({
				embed: {
					color: 0x00FF00,
					description: `\`\`\`${result}\`\`\``,
					footer: {
						text: `It took ${timeTaken}ms for the math equation to evaluate!`,
					},
				},
			});
		} catch (err) {
			m.edit({
				embed: {
					color: 0xFF0000,
					description: `\`\`\`${err}\`\`\``,
					footer: {
						text: `You definitely did something wrong here!`,
					},
				},
			});
		}
	} else {
		winston.warn(`Parameters not provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `I need something to calculate 🙄`,
				footer: {
					text: `Mathematical expressions are hard without a calculator! Use me instead!`,
				},
			},
		});
	}
};
