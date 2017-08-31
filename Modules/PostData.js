const { tokens } = require("../Configurations/auth.js");
const snekfetch = require("snekfetch");

module.exports = async bot => {
	const totalAmount = await bot.guilds.totalCount;
	if (tokens.carboniteEx) {
		let res;
		try {
			res = await snekfetch.post(`https://www.carbonitex.net/discord/data/botdata.php`).set({
				Accept: "application/json",
				"Content-Type": "application/json",
			}).send({
				key: tokens.carboniteEx,
				servercount: totalAmount,
			});
		} catch (err) {
			winston.error(`Failed to post to CarboniteEx...`, err);
		}
		if (res.status === 200) {
			winston.info(`Succesfully POSTed to CarboniteEx`);
		} else {
			winston.warn(`Failed to POST to CarboniteEx`, { statusCode: res.status });
		}
	}

	if (tokens.discordList) {
		let res;
		try {
			res = await snekfetch.post(`https://bots.discordlist.net/api`).set("Content-Type", "application/x-www-form-urlencoded").send({
				token: tokens.discordList,
				servers: totalAmount,
			});
		} catch (err) {
			winston.error(`Failed to post to Discordlist.net >~<`, err);
		}
		if (res.status === 200) {
			winston.info(`Succesfully POSTed to Discordlist.net`);
		} else {
			winston.warn(`Failed to POST to Discordlist.net`, { statusCode: res.status });
		}
	}

	// Send server ammount to DBots per shard
	if (tokens.discordBots) {
		let res;
		try {
			res = await snekfetch.post(`https://bots.discord.pw/api/bots/${bot.user.id}/stats`).set({
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: tokens.discordBots,
			}).send({
				shard_id: Number(process.env.SHARD_ID),
				shard_total: Number(process.env.SHARD_COUNT),
				server_count: bot.guilds.size,
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
