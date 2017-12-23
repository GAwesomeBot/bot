const { get } = require("snekfetch");
const ReactionMenu = require("../../Modules/MessageUtils/ReactionBasedMenu");

module.exports = async ({ Constants: { Colors } }, { serverDocument }, msg, commandData) => {
	if (msg.suffix) {
		let split = msg.suffix.split(/\s+/);
		let number = split.pop(), query = split.join(" ");
		if (!query || isNaN(number)) {
			query = msg.suffix;
			number = serverDocument.config.command_fetch_properties.default_count;
		}
		if (number < 1) number = serverDocument.config.command_fetch_properties.default_count;
		else if (number > serverDocument.config.command_fetch_properties.max_count) number = serverDocument.config.command_fetch_properties.max_count;
		else number = parseInt(number);

		const API = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}`;
		let { body, status } = await get(API).set("Accept", "application/vnd.api+json");
		body = JSON.parse(body.toString());
		if (status === 200 && body.data && body.data.length) {
			let m = await msg.channel.send(`test`);
			let menu = new ReactionMenu(m, msg, ["i", "like", "eggs"]);
		} else {
			winston.verbose(`Couldn't find any animes for "${query}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
			msg.channel.send({
				embed: {
					color: Colors.LIGHT_RED,
					description: `No animu found... (˃̥̥ω˂̥̥̥)`,
					footer: {
						text: `P-please try again ${msg.author.username}-chan..!`,
					},
				},
			});
		}
	} else {
		winston.verbose(`Anime name not provided for "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.send({
			embed: {
				color: Colors.LIGHT_RED,
				image: {
					url: `http://i66.tinypic.com/23vxcbc.jpg`,
				},
				title: `Baka!`,
				description: `You need to give me an anime to search for, ${msg.author.username}-chan`,
			},
		});
	}
};
