const auth = require("./../Configuration/auth.json");
const postData = require("./../Modules/PostData.js");

// Leave server and delete data
module.exports = (bot, db, config, winston, svr) => {
	winston.info(`Left server '${svr.name}'`, {svrid: svr.id});
	postData(winston, auth, bot.guilds.size, bot.user.id);
	db.servers.remove({_id: svr.id}, err => {
		if(err) {
			winston.error("Failed to remove server data", {svrid: svr.id}, err);
		}
	});
};