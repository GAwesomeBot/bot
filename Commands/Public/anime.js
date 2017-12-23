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
			const list = [];
			const results = [];
			const getDisplay = data => {
				// Title + airing time
				let airing = data.attributes.startDate;
				if (data.attributes.endDate !== null) {
					airing += ` — ${data.attributes.endDate}`;
				}
				let totalResult = "";
				if (data.attributes.averageRating) {
					totalResult += `Rating is ${data.attributes.averageRating}%`;
				}
				if (data.attributes.ageRating && data.attributes.averageRating) {
					totalResult += ` | Rated ${data.attributes.ageRating}`;
				} else {
					totalResult += `Rated ${data.attributes.ageRating}`;
				}
				if (!data.attributes.episodeCount) {
					data.attributes.episodeCount = "N/A";
				}
				if (data.attributes.episodeLength) {
					totalResult += ` | ${data.attributes.episodeCount} episode${data.attributes.episodeCount === 1 ? "" : "s"}, each lasting ${data.attributes.episodeLength} minutes.`;
				} else {
					totalResult += ` | ${data.attributes.episodeCount} episode${data.attributes.episodeCount === 1 ? "" : "s"}.`;
				}
				return {
					embed: {
						color: 0x00FF00,
						author: {
							iconURl: `${data.attributes.posterImage.tiny}`,
						},
						title: `${data.attributes.canonicalTitle} (${airing})`,
						url: `https://kitsu.io/anime/${data.attributes.slug}`,
						description: `${data.attributes.synopsis.split("").splice(0, 1500).join("")}${data.attributes.synopsis.length > 1500 ? `...\nRead more [here](https://kitsu.io/anime/${data.attributes.slug})` : ""}`,
						footer: {
							text: `${totalResult}\nClick on the "Anime Name" to see the webpage!`,
						},
						image: {
							url: `${data.attributes.posterImage.original}`,
						},
					},
				};
			};
			for (let i = 0; i < number; i++) {
				const entry = body.data[i];
				if (entry) {
					results.push(getDisplay(entry));
					list.push(`[ ${i + 1} ] ${entry.attributes.canonicalTitle}`);
				}
			}
			if (list.length === 1) {
				msg.channel.send(results[0]);
			} else {
				// eslint-disable-next-line no-new
				new ReactionMenu(msg, list, results);
			}
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
