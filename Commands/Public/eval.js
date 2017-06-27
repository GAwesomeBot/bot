const util = require("util");
const TimeTaken = require("./../../Modules/TimeTaken.js");
const hastebin = require("./../../Modules/HastebinUpload.js");

/* eslint-disable max-len */
module.exports = async (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if (!config.maintainers.includes(msg.author.id)) {
		return msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				title: `Well well, what do we have here?`,
				description: `Somehow, someway, you managed to run the Maintainer-Only Command while you aren't a maintainer..`,
				footer: {
					text: `If you think you know how you managed it, report it on the GitHub 😃`,
				},
			},
		});
	} else if (suffix) {
		const m = await msg.channel.createMessage({
			embed: {
				color: 0x9ECDF2,
				title: `Evaluating...`,
				footer: {
					text: `This shouldn't take long unless you killed me.. In which case.. ¯\\_(ツ)_/¯`,
				},
			},
		});
		const timeTaken = TimeTaken(m, msg);
		try {
			if (suffix.startsWith("```js") && suffix.endsWith("```")) {
				suffix = suffix.substring(5, suffix.length - 3);
			}
			// eslint-disable-next-line
			const toEval = evalCode => {
				return `(async () => {${evalCode}})()`;
			};
			let result = await eval(toEval(suffix));
			if (typeof result !== "string") {
				result = util.inspect(result, false, 2);
			}
			if (result === bot.token || result === require("./../../Configuration/auth.json").platform.login_token) {
				return m.edit({
					embed: {
						color: 0xFF0000,
						title: `Uh-oh.. Thats not allowed..`,
						description: `You tried to evaluate something that isn't allowed! Sorry! 😝`,
					},
				});
			}
			if (result.length > 5900) {
				m.edit({
					embed: {
						color: 0xFFFF00,
						description: `The result is larger than 6000 characters.. You can see the full result [here](${await hastebin(result.replace(new RegExp(`${bot.token}|${require("./../../Configuration/auth.json").platform.login_token}`, "g"), "(╯°□°）╯︵ ┻━┻"))})`,
					},
				});
			} else {
				m.edit({
					embed: {
						color: 0x00FF00,
						title: `OUTPUT`,
						description: `\`\`\`js\n${result}\`\`\``,
						footer: {
							text: `Time taken: ${timeTaken}ms`,
						},
					},
				});
			}
		} catch (err) {
			m.edit({
				embed: {
					color: 0xFF0000,
					title: `ERROR`,
					description: `\`\`\`js\n${err}\`\`\`\n[Full Stacktrace](${await hastebin(err.stack)})`,
					footer: {
						text: `Time taken: ${timeTaken}ms`,
					},
				},
			});
		}
	} else {
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `As a Maintainer, you should know I need a thing to evaluate 😉\nUnless you're a fake... 😱`,
			},
		});
	}
};
