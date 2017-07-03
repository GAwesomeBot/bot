const gplay = require("google-play-scraper");

const getAppList = suffix => {
	const apps = suffix.split(",");
	let i = 0;
	while (i < apps.length) {
		if (!apps[i] || apps.indexOf(apps[i]) !== i) {
			apps.splice(i, 1);
		} else {
			apps[i] = apps[i].trim();
			i++;
		}
	}
	return apps;
};

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	const apps = getAppList(suffix);
	if (apps.length > 0) {
		let results = [];
		const fetchApp = (i, cb) => {
			if (i >= apps.length) {
				return cb();
			} else {
				gplay.search({
					term: apps[i],
					num: 1,
				}).then((data, err) => {
					if (!err && data && data.length > 0) {
						results.push({
							color: 0x00FF00,
							author: {
								name: `By ${data[0].developer}`,
							},
							thumbnail: {
								url: data[0].icon ? `http:${data[0].icon}` : "",
							},
							title: `__${data[0].title}__`,
							url: `${data[0].url}`,
							description: `A quick summary: \`\`\`\n${data[0].summary}\`\`\``,
							footer: {
								text: `Rated ${data[0].score} ⭐ | ${data[0].free ? `This app is free` : `This app costs ${data[0].price}`}`,
							},
						});
					} else {
						winston.warn(`Google Play app "${apps[i]}" not found to link`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
						results.push({
							color: 0xFF0000,
							description: `There were no results for the app called \`${apps[i]}\`.❌`,
							footer: {
								text: `You should try searching for the app again, making sure you spelt it right.`,
							},
						});
					}
					fetchApp(++i, cb);
				});
			}
		};
		fetchApp(0, () => {
			for (let i = 0; i < results.length; i++) {
				msg.channel.createMessage({
					embed: results[i],
				});
			}
		});
	} else {
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `[What app would you like to find today..? 🤔](https://play.google.com/store/apps/)`,
			},
		});
	}
};
