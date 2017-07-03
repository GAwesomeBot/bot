const itunes = require("searchitunes");
const getAppList = suffix => {
	let apps = suffix.split(","), i = 0;
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
	let apps = getAppList(suffix);
	if (apps.length > 0) {
		let results = [];
		let fetchApp = (i, cb) => {
			if (i >= apps.length) {
				return cb();
			}	else {
				itunes({ entity: "software", country: "US", term: apps[i], limit: 1 }, (err, data) => {
					if (err) {
						winston.warn(`Apple app "${apps[i]}" not found to link`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
						results.push({
							color: 0xFF0000,
							description: `There were no results for the app called \`${apps[i]}\`.❌`,
							footer: {
								text: `You should try searching for the app again, making sure you spelt it right.`,
							},
						});
					} else {
						results.push({
							color: 0x00FF00,
							author: {
								name: `By ${data.results[0].artistName} ${data.results[0].sellerUrl ? "(Click here to see the sellers site)" : ""}`,
								url: data.results[0].sellerUrl ? data.results[0].sellerUrl : "",
							},
							title: `__${data.results[0].trackCensoredName}__`,
							description: `Rated ${data.results[0].averageUserRating} ⭐\nMore info [here](${data.results[0].trackViewUrl})`,
							footer: {
								text: data.results[0].formattedPrice.toLowerCase() === "free" ? "This app is free" : `The price of the app is ${data.results[0].formattedPrice}`,
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
				description: `[What app would you like to find today..? 🤔](https://www.apple.com/itunes/charts/free-apps/)`,
			},
		});
	}
};
