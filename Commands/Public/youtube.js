const auth = require("../../Configurations/auth.js");
const { get } = require("snekfetch");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");

module.exports = async ({ Constants: { APIs, Colors, Text, UserAgent }, client }, { serverDocument }, msg, commandData) => {
	if (!msg.suffix) {
		await msg.sendInvalidUsage(commandData);
		return;
	}
	let query = msg.suffix.substring(0, msg.suffix.lastIndexOf(" "));
	let num = msg.suffix.substring(msg.suffix.lastIndexOf(" "));

	if (!query || isNaN(num)) {
		query = msg.suffix;
		num = serverDocument.config.command_fetch_properties.default_count;
	}
	num = parseInt(num);
	if (num < 1 || num > serverDocument.config.command_fetch_properties.max_count) num = serverDocument.config.command_fetch_properties.max_count;
	if (num > 10) num = 10;

	const { body, statusCode } = await get(APIs.YOUTUBE(auth.tokens.googleAPI, query, num));
	if (statusCode === 200 && body.items && body.items.length) {
		const descriptions = [];
		const thumbnails = [];
		const titles = [];
		const footers = [];
		const timestamps = [];
		const urls = [];

		body.items.forEach(item => {
			if (!item.snippet) return;
			timestamps.push(new Date(item.snippet.publishedAt));
			switch (item.id.kind) {
				case "youtube#video":
					footers.push("Video");
					urls.push(`https://youtube.com/watch?v=${item.id.videoId}`);
					break;
				case "youtube#playlist":
					footers.push("Playlist");
					urls.push(`https://youtube.com/playlist?list=${item.id.playlistId}`);
					break;
				case "youtube#channel":
					footers.push("Channel");
					urls.push(`https://youtube.com/channel/${item.id.channelId}`);
					break;
				default:
					footers.push("Unknown");
			}
			if (item.snippet.description) descriptions.push(item.snippet.description);
			else descriptions.push("");
			titles.push(item.snippet.title);
			if (item.snippet.thumbnails.default) thumbnails.push(item.snippet.thumbnails.default.url);
			else thumbnails.push("");
		});

		await new PaginatedEmbed(msg, {
			color: Colors.YOUTUBE,
			footer: "{footer} • Result {currentPage} out of {totalPages}",
		}, {
			descriptions,
			thumbnails,
			titles,
			footers,
			timestamps,
			urls,
		}).init();
	} else {
		await msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: `No results were found for **${query}**. 😞`,
			},
		});
	}
};
