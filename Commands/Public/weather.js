const weather = require("weather-js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let unit = "C";
	if(userDocument.weatherunit && userDocument.weatherunit == "Fahrenheit") unit = "F";
	if([" F", " C"].indexOf(suffix.toUpperCase().substring(suffix.length-2))>-1) {
		unit = suffix.charAt(suffix.length-1).toUpperCase().toString();
		suffix = suffix.substring(0, suffix.length-2);
	}

	const getWeather = (location, member, unit) => {
		if(location) {
			try {
				weather.find({search: location, degreeType: unit}, (err, data) => {
					if(err) {
						winston.warn(`No weather data found for '${location}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
						msg.channel.createMessage(`${msg.author.mention} I can't find weather info for ${location} 🌇`);
					} else {
						data = data[0];
						msg.channel.createMessage(`**${member ? (`Weather for @${bot.getName(msg.channel.guild, serverDocument, member)}`) : data.location.name} right now:**\n${data.current.temperature}°${unit} ${data.current.skytext}, feels like ${data.current.feelslike}°, ${data.current.winddisplay} wind\n**Forecast for tomorrow:**\nHigh: ${data.forecast[1].high}°, low: ${data.forecast[1].low}° ${data.forecast[1].skytextday} with ${data.forecast[1].precip}% chance precip.`);
					}
				});
			} catch(err) {
				winston.error("Failed to get weather data", {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
				msg.channel.createMessage("Idk why this is broken tbh 😭");
			}
		} else {
			winston.warn(`Parameters not provided for '${commandData.name}' command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage(`${msg.author.mention} I don't have a default location set for you. PM me \`profile location|<your city>\` to set one 🌞`);
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
					getWeather(location || suffix, member, unit);
				});
				return;
			}
		} else if(suffix.indexOf("in ")==0) {
			suffix = suffix.slice(3);
		}
		getWeather(suffix, null, unit);
	} else {
		locateUser(msg.author.id, location => {
			getWeather(location, msg.member, unit);
		});
	}
};
