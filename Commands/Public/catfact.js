const unirest = require("unirest");

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	let num = suffix;
	if (!num) {
		num = 1;
	}
	if (num < 1) {
		num = serverDocument.config.command_fetch_properties.default_count;
	} else if (num > serverDocument.config.command_fetch_properties.max_count) {
		num = serverDocument.config.command_fetch_properties.max_count;
	} else if (isNaN(num)) {
		num = serverDocument.config.command_fetch_properties.default_count;
	} else {
		num = parseInt(num);
	}
	unirest.get(`http://catfacts-api.appspot.com/api/facts?number=${num}`).header("Accept", "application/json").end(res => {
		if (res.status === 200) {
			for (let i = 0; i < num; i++) {
				msg.channel.createMessage({
					embed: {
						color: 0x00FF00,
						description: JSON.parse(res.body).facts[i],
						footer: {
							text: `Cat fact #${(i + 1)}`,
						},
					},
				});
			}
		} else {
			winston.error("Failed to fetch cat fact(s)", { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.channel.createMessage({
				embed: {
					color: 0x9ECDF2,
					description: "Cats exist and are cute af. 😻",
					footer: {
						text: `That means there was an error, try again! Cat facts are there somewhere, waiting to be found!`,
					},
				},
			});
		}
	});
};
