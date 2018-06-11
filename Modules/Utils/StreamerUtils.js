/* eslint-disable max-len */
const auth = require("../../Configurations/auth.js");
const snekfetch = require("snekfetch");

const isStreamingTwitch = async username => {
	const { body: { stream }, statusCode } = await snekfetch.get(`https://api.twitch.tv/kraken/streams/${username}?client_id=${auth.tokens.twitchClientID}`);
	if (statusCode === 200 && stream) {
		return {
			name: stream.channel.display_name,
			type: "Twitch",
			game: stream.game,
			url: stream.channel.url,
			streamerImage: stream.channel.logo,
			preview: stream.preview.large,
		};
	}
};

const isStreamingYoutube = async channel => {
	const { body: { items }, statusCode } = await snekfetch.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel}&type=video&eventType=live&key=${auth.tokens.googleAPI}`);
	const item = items[0];
	if (statusCode === 200 && item && item.snippet.liveBroadcastContent === "live") {
		return {
			name: item.snippet.channelTitle,
			type: "YouTube",
			game: item.snippet.title,
			url: `https://youtube.com/watch?v=${item.id.videoId}`,
			preview: item.snippet.thumbnails.high.url,
		};
	}
};

module.exports = async (type, username) => {
	username = encodeURIComponent(username);
	switch (type) {
		case "twitch": {
			return isStreamingTwitch(username);
		}
		case "ytg": {
			return isStreamingYoutube(username);
		}
	}
};
