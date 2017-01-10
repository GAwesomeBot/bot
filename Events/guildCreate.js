const auth = require("./../Configuration/auth.json");
const getNewServerData = require("./../Modules/NewServer.js");
const postData = require("./../Modules/PostData.js");

// Join new server
module.exports = (bot, db, config, winston, svr) => {
	svr.fetchAllMembers();
	postData(winston, auth, bot.guilds.size, bot.user.id);
	db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
		if(err || !serverDocument) {
			winston.info(`Joined server '${svr.name}'`, {svrid: svr.id});
			db.servers.create(getNewServerData(bot, svr, new db.servers({_id: svr.id})), err => {
				if(err) {
					winston.error("Failed to insert server data", {svrid: svr.id});
				}
			});
		}
	});
};