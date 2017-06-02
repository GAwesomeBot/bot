const unirest = require("unirest");
const S = require("string");

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const nsfw_check = new RegExp(/^nsfw(-|$)/).test(msg.channel.name);
	if (!nsfw_check) {
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `While you want to see your...*pictures*...you'll have to run this command in a channel that's marked \`nsfw\`! 🙄`,
				footer: {
					text: `That means the channel name is either "nsfw", or it's prefixed with "nsfw-"!`,
				},
			},
		});
	} else if (suffix) {
		let query = suffix.substring(0, suffix.lastIndexOf(" "));
		let num = suffix.substring(suffix.lastIndexOf(" ") + 1);
		if (!query || isNaN(num)) {
			query = suffix;
			num = serverDocument.config.command_fetch_properties.default_count;
		}
		if (num > serverDocument.config.command_fetch_properties.max_count) {
			num = serverDocument.config.command_fetch_properties.max_count;
		}
		const api_url = `https://e621.net/post/index.json?tags=${encodeURIComponent(query)}&limit=${num}`;
		unirest.get(api_url).headers({
			Accept: "application/json",
			"User-Agent": "Unirest node.js",
		}).end(res => {
			if (res.status === 200) {
				let info = [];
				for (let i = 0; i < res.body.length; i++) {
					info.push({
						author: {
							name: `Made by ${res.body[i].author}`,
						},
						color: 0x00FF00,
						fields: [
							{
								name: `Rating`,
								value: `${(S(res.body[i].rating).capitalize().s || "None")}`,
								inline: true,
							},
							{
								name: `Score`,
								value: `${res.body[i].score}`,
								inline: true,
							},
						],
						description: res.body[i].description ? `\`\`\`${res.body[i].description}\`\`\`` : "",
						footer: {
							text: `Favorites: ${res.body[i].fav_count}`,
						},
						image: {
							url: `${res.body[i].file_url}`,
						},
					});
				}
				for (let i = 0; i < info.length; i++) {
					msg.channel.createMessage({
						embed: info[i],
					});
				}
			} else {
				winston.warn(`No ${commandData.name} results found for "${query}"`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `Damn... e621 failed me.. 😥`,
						footer: {
							text: `Try again, you should find what you want. ( ͡° ͜ʖ ͡° )`,
						},
					},
				});
			}
		});
	} else {
		winston.warn(`Parameters not provided for "${commandData.name}" command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.createMessage({
			embed: {
				color: 0xFF0000,
				description: `You gotta give me somethin' to search for! ( ͡° ͜ʖ ͡° )`,
			},
		});
	}
};
