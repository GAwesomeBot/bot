const convert = require("convert-units");
const Currency = require("./../../Modules/ConvertCurrency.js");
const TimeTaken = require("./../../Modules/TimeTaken.js");

/* eslint-disable max-len */
module.exports = async (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const args = suffix.split(" ");
	if (args.length === 4 && args[2].toLowerCase() === "to") {
		args.splice(2, 1);
	}
	if (args.length === 3 && args[0] && !isNaN(args[0]) && args[1] && args[2]) {
		let m = await msg.channel.createMessage({
			embed: {
				color: 0x9ECDF2,
				description: `Converting...`,
				footer: {
					text: `This shouldn't take long...`,
				},
			},
		});
		try {
			const converted = Math.round(convert(args[0]).from(args[1]).to(args[2]) * 1000) / 1000;
			const timeTaken = TimeTaken(m, msg);
			m.edit({
				embed: {
					color: 0x00FF00,
					description: `\`\`\`${converted}${args[2]}\`\`\``,
					footer: {
						text: `It took ${timeTaken}ms to convert.`,
					},
				},
			});
		} catch (err) {
			try {
				let converted;
				Currency.convert(args[0], args[1], args[2]).then(res => {
					converted = res.amount;
				});
				const timeTaken = TimeTaken(m, msg);
				m.edit({
					embed: {
						color: 0x00FF00,
						description: `\`\`\`${converted}${args[2].toUpperCase()}\`\`\``,
						footer: {
							text: `It took ${timeTaken}ms to convert.`,
						},
					},
				});
			} catch (secondErr) {
				winston.warn(`Unsupported conversion units "${args[1]}" and "${args[2]}" provided for "${commandData.name}" command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `I don't support that unit, please try something else ↩.\nYou can use standard currency codes or any of [these](https://github.com/ben-ng/convert-units#supported-units)`,
					},
				});
			}
		}
	} else {
		winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `Huh? Did you mistype?`,
				footer: {
					text: `Make sure to use the syntax "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name}${commandData.usage}"`,
				},
			},
		});
	}
};
