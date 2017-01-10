const unirest = require("unirest");

module.exports = (winston, auth, svrCount, botId) => {
    // Send server count to Carbonitex bot list
	if(auth.tokens.carbon_key) {
		unirest.post("https://www.carbonitex.net/discord/data/botdata.php").headers({
			"Accept": "application/json",
			"Content-Type": "application/json"
		}).send({
			"key": auth.tokens.carbon_key,
			"servercount": svrCount
		}).end(res => {
			if(res.status!=200) {
				winston.error("Failed to POST to Carbonitex");
			}
		});
	}

    // Send server account to DBots
	if(auth.tokens.discordbots_key) {
		unirest.post(`https://bots.discord.pw/api/bots/${botId}/stats`).headers({
			"Accept": "application/json",
			"Content-Type": "application/json",
			"Authorization": auth.tokens.discordbots_key
		}).send({
			"server_count": svrCount
		}).end(res => {
			if(res.status!=200) {
				winston.error("Failed to POST to DBots");
			}
		});
	}
};
