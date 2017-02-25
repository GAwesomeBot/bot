const gplay = require("google-play-scraper");

const getAppList = suffix => {
	const apps = suffix.split(",");
	let i = 0;
	while(i < apps.length) {
		if(!apps[i] || apps.indexOf(apps[i]) != i) {
			apps.splice(i, 1);
		} else {
			apps[i] = apps[i].trim();
			i++;
		}
	}
	return apps;
};

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	const apps = getAppList(suffix);
	if(apps.length > 0) {
		const results = [];
		const fetchApp = (i, callback) => {
			if(i >= apps.length) {
				callback();
			} else {
				gplay.search({
					term: apps[i],
					num: 1
				}).then((data, err) => {
					if(!err && data && data.length > 0) {
						let info = `**${data[0].title}** by ${data[0].developer}, `;
						if(data[0].free) {
							info += "free";
						} else {
							info += data[0].price;
						}
						info += ` and rated ${data[0].score} stars: <${data[0].url}>`;
						results.push(info);
					} else {
						winston.warn(`Google Play app '${apps[i]}' not found to link`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
						results.push(`❌ No results found for \`${apps[i]}\``);
					}
					fetchApp(++i, callback);
				});
			}
		};
		fetchApp(0, () => {
			bot.sendArray(msg.channel, results);
		});
	} else {
		msg.channel.createMessage("https://play.google.com/store/apps/");
	}
};
