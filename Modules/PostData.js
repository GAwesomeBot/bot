const { tokens } = require("../Configurations/auth.js");
const { GetValue } = require("./Utils/");

module.exports = async bot => {
	const totalAmount = await GetValue(bot, "guilds.size", "int");
	if (tokens.carboniteEx) {
		let res;
		try {
			res = await rp.post({
				uri: `https://www.carbonitex.net/discord/data/botdata.php`,
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				json: true,
				body: {
					key: tokens.carboniteEx,
					servercount: totalAmount,
				},
			});
		} catch (err) {
			winston.error(`Failed to pot to CarboniteEx...`, err);
		}
		if (res.statusCode === 200) {
			winston.info(`Succesfully POSTed to CarboniteEx`);
		} else {
			winston.warn(`Failed to POST to CarboniteEx`, { statusCode: res.statusCode });
		}
	}

	if (tokens.discordList) {
		let res;
		try {
			res = await rp.post({
				uri: `https://bots.discordlist.net/api`,
				formData: {
					token: tokens.discordList,
					servers: totalAmount,
				},
			});
		} catch (err) {
			winston.error(`Failed to post to Discordlist.net >~<`, err);
		}
		if (res.statusCode === 200) {
			winston.info(`Succesfully POSTed to Discordlist.net`);
		} else {
			winston.warn(`Failed to POST to Discordlist.net`, { statusCode: res.statusCode });
		}
	}

	// Send server ammount to DBots per shard
	if (tokens.discordBots) {
		let res;
		try {
			res = await rp.post({
				uri: `https://bots.discord.pw/api/bots/${bot.user.id}/stats`,
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					Authorization: tokens.discordBots,
				},
				json: true,
				body: {
					shard_id: process.env.SHARD_ID,
					shard_total: process.env.SHARD_COUNT,
					server_count: bot.guilds.size,
				},
			});
		} catch (err) {
			winston.warn(`Failed to post to DiscordBots..\n`, err);
		}
		if (res.statusCode === 200) {
			winston.info(`Succesfully POSTed to bots.discord.pw`);
		} else {
			winston.warn(`Failed to POST to bots.discord.pw`, { statusCode: res.statusCode });
		}
	}
};
