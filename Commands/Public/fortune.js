const unirest = require("unirest");

module.exports = function fortune(bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) {
	const categories = ["all", "computers", "cookie", "definitions", "miscellaneous", "people", "platitudes", "politics", "science", "wisdom"];
	if (suffix) {
		const category_suffix = suffix.trim().toLowerCase();
		if (categories.includes(category_suffix)) {
			let api_url = `http://yerkee.com/api/fortune/${category_suffix}`;
			unirest.get(api_url).headers({
				Accept: "application/json",
			}).end(res => {
				if (res.status === 200) {
					msg.channel.createMessage({
						embed: {
							color: 0x00FF00,
							author: {
								name: `Our Fortune Machine says:`,
							},
							description: res.body.fortune,
						},
					});
				} else {
					winston.warn(`Failed to fetch fortune`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
					msg.channel.createMessage({
						embed: {
							color: 0xFF0000,
							description: `I honestly don't know.. 😐`,
							footer: {
								text: `Try again, maybe I forgot those fresh fortunes!`,
							},
						},
					});
				}
			});
		} else {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					title: `"${category_suffix}" isn't part of the available categories.`,
					description: `Please use one of these categories: \`\`\`css\n${categories.join(", ")}\`\`\``,
				},
			});
		}
	} else {
		unirest.get("http://yerkee.com/api/fortune/").headers({
			Accept: "application/json",
		}).end(res => {
			if (res.status === 200) {
				msg.channel.createMessage({
					embed: {
						color: 0x00FF00,
						author: {
							name: `Our Fortune Machine says:`,
						},
						description: res.body.fortune,
					},
				});
			} else {
				winston.warn("Failed to fetch fortune", { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `I honestly don't know 😐`,
						footer: {
							text: `Try again, maybe I forgot those fresh fortunes!`,
						},
					},
				});
			}
		});
	}
};
