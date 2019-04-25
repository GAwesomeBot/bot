const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");
const isStreaming = require("../../Modules/Utils/StreamerUtils");

module.exports = async ({ Constants: { Colors, Text }, client }, { serverDocument }, msg, commandData) => {
	if (serverDocument.config.streamers_data.length) {
		const descriptions = [];
		const thumbnails = [];
		const titles = [];
		const footers = [];
		const colors = [];
		await Promise.all(serverDocument.config.streamers_data.map(async streamer => {
			const streamerData = await isStreaming(streamer.type, streamer._id);
			if (!streamerData) return;
			descriptions.push(`**${streamerData.name}** is streaming **${streamerData.game}**, [watch their stream now](${streamerData.url})!`);
			thumbnails.push(streamerData.preview);
			titles.push(`${streamerData.name} is live!`);
			footers.push(`${streamerData.type} Streamer • `);
			colors.push(streamerData.type === "YouTube" ? Colors.YOUTUBE : Colors.TWITCH);
		}));
		if (descriptions.length) {
			await new PaginatedEmbed(msg, {
				footer: "{footer}Streamer {currentPage} out of {totalPages}",
			}, {
				descriptions,
				thumbnails,
				titles,
				footers,
				colors,
			}).init();
		} else if (serverDocument.config.streamers_data.length === 1) {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "The 1 streamer added to this server isn't live right now. 😞",
				},
			});
		} else {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `None of the ${serverDocument.config.streamers_data.length} streamers added to this server are live right now. 😞`,
				},
			});
		}
	} else {
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: "I'm not tracking any streamers yet!\nA Server Admin can add a streamer to track on the dashboard! 🌐",
			},
		});
	}
};
