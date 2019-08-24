const { Gist, RegExpMaker } = require("../../Modules/Utils/");

module.exports = async (main, msg, commandData) => {
	if (msg.suffix) {
		const hrstart = process.hrtime();
		const forceUnsafe = msg.suffix.split(" ")[0].toLowerCase() === "--unsafe";
		let { suffix } = msg;
		if (forceUnsafe) suffix = suffix.split(" ").slice(1).join(" ");
		try {
			if (suffix.startsWith("```js") && suffix.endsWith("```")) suffix = suffix.substring(5, suffix.length - 3);
			const asyncEval = (code, returns) => `(async () => {\n${!returns ? `return ${code.trim()}` : `${code.trim()}`}\n})()`;
			if (!forceUnsafe) {
				suffix = suffix
					.replace(/(main\.bot\.token|main\.client\.token|msg\.client\.token)/g, "\"mfaNop\"")
					.replace(/\.(clientToken|clientSecret|discordList|discordBots|discordBotsOrg|giphyAPI|googleCSEID|googleAPI|imgurClientID|microsoftTranslation|twitchClientID|wolframAppID|openExchangeRatesKey|omdbAPI|gistKey)/g, "mfaNop");
			}
			const { discord, tokens } = require("../../Configurations/auth");
			const censor = [
				discord.clientSecret,
				discord.clientToken,
				tokens.discordList,
				tokens.discordBots,
				tokens.discordBotsOrg,
				tokens.giphyAPI,
				tokens.googleCSEID,
				tokens.googleAPI,
				tokens.imgurClientID,
				tokens.microsoftTranslation,
				tokens.twitchClientID,
				tokens.wolframAppID,
				tokens.openExchangeRatesKey,
				tokens.omdbAPI,
				tokens.gistKey,
			];
			const regex = new RegExpMaker(censor).make("gi");
			let result = await eval(asyncEval(suffix, suffix.includes("return")));
			if (typeof result !== "string") result = require("util").inspect(result, false, 1);
			result = result.replace(regex, "-- GAB SNIP --");
			if (result.length <= 1980) {
				msg.send({
					embed: {
						color: 0x00FF00,
						description: `\`\`\`js\n${result}\`\`\``,
						footer: {
							text: `Execution time: ${process.hrtime(hrstart)[0]}s ${Math.floor(process.hrtime(hrstart)[1] / 1000000)}ms`,
						},
					},
				});
			} else {
				const GistUpload = new Gist(main.client);
				const res = await GistUpload.upload({
					title: "Eval Result",
					text: result,
					file: "eval_results.js",
				});
				res && res.url && msg.send({
					embed: {
						color: 0x3669FA,
						title: `The eval results were too large!`,
						description: `As such, I've uploaded them to a gist. Check them out [here](${res.url})`,
					},
				});
			}
		} catch (err) {
			msg.send({
				embed: {
					color: 0xFF0000,
					description: `\`\`\`js\n${err.stack}\`\`\``,
					footer: {
						text: `Execution time: ${process.hrtime(hrstart)[0]}s ${Math.floor(process.hrtime(hrstart)[1] / 1000000)}ms`,
					},
				},
			});
		}
	} else {
		msg.send({
			embed: {
				color: 0xFF0000,
				description: `What would you like to evaluate?`,
				footer: {
					text: `Come on, give me something to work with!`,
				},
			},
		});
	}
};
