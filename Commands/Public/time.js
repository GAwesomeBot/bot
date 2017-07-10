const unirest = require("unirest");
const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const getTime = (location, member, otherusr) => {
		if(location) {
			unirest.get(`http://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}`).header("Accept", "application/json").end(res => {
				if(res.status==200 && res.body.results.length>0) {
					location = res.body.results[0].formatted_address;
					unirest.get(`https://maps.googleapis.com/maps/api/timezone/json?location=${res.body.results[0].geometry.location.lat},${res.body.results[0].geometry.location.lng}&timestamp=${Math.floor(Date.now() / 1000)}&sensor=false`).header("Accept", "application/json").end(res => {
						const date = new Date(Date.now() + (parseInt(res.body.rawOffset) * 1000) + (parseInt(res.body.dstOffset) * 1000));
						msg.channel.createMessage(`🕐 It's ${moment(date).utc().format(config.moment_date_format).replaceAll(" at ", " ")} ${member ? (`for @${bot.getName(msg.channel.guild, serverDocument, member)}`) : (`in ${location}`)} (${res.body.timeZoneName})`);
					});
				} else {
					if(otherusr) msg.channel.createMessage(`${msg.author.mention} That user hasn't set a location in their profile.`);
					else msg.channel.createMessage(`${msg.author.mention} A little birdie told me that place doesn't exist 😉`);
				}
			});
		} else {
			winston.warn(`Parameters not provided for '${commandData.name}' command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage(`${msg.author.mention} I don't have a default location set for you. PM me \`profile location|<your city>\` to set one ⌚️`);
		}
	};

	const locateUser = (usrid, callback) => {
		db.users.findOne({_id: usrid}, (err, userDocument) => {
			if(!err && userDocument && userDocument.location) {
				callback(userDocument.location);
			} else {
				callback();
			}
		});
	};
	
	if(suffix) {
		if(suffix.indexOf("<@")==0) {
			const member = bot.memberSearch(suffix, msg.channel.guild);
			if(member) {
				locateUser(member.id, location => {
					getTime(location || suffix, member, true);
				});
				return;
			}
		} else if(suffix.indexOf("in ")==0) {
			suffix = suffix.slice(3);
		}
		getTime(suffix);
	} else {
		locateUser(msg.author.id, location => {
			getTime(location, msg.member);
		});
	}
};
