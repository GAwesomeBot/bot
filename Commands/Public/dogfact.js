const unirest = require("unirest");

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
	unirest.get(`https://dog-api.kinduff.com/api/facts?number=${num}`).header("Accept", "application/json").end(res => {
		if (res.status === 200) {
			let arrayFacts = res.body.facts;
			for (let i = 0; i < arrayFacts.length; i++) {
				msg.channel.createMessage({
					embed: {
						color: 0x00FF00,
						description: arrayFacts[i],
						footer: {
							text: `Dog fact #${(i + 1)}`,
						},
					},
				});
			}
		} else {
			winston.error("Failed to fetch dog fact(s)", { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.channel.createMessage({
				embed: {
					color: 0x9ECDF2,
					description: "Dogs exist and are cute af. 🐶",
					footer: {
						text: `That means there was an error, try again! Dog facts are there somewhere, waiting to be found!`,
					},
				},
			});
		}
	});
};
