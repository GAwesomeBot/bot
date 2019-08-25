/* eslint-disable max-len */
const auth = require("../../Configurations/auth.js");
const fetch = require("chainfetch");

const isStreamingTwitch = async username => {
	try {
		const { body: { stream }, statusCode } = await fetch.get(`https://api.twitch.tv/kraken/streams/${username}?client_id=${auth.tokens.twitchClientID}`);
		if (statusCode === 200 && stream) {
			return {
				name: stream.channel.display_name,
				type: "Twitch",
				game: stream.game,
				url: stream.channel.url,
				streamerImage: stream.channel.logo,
				preview: stream.preview.large,
				invalid: false,
				error: null,
			};
		} else {
			return {
				invalid: true,
				error: null,
			};
		}
	} catch (err) {
		if (err.statusCode === 404) {
			return {
				invalid: true,
				error: null,
			};
		}
		return {
			invalid: true,
			error: err,
		};
	}
};

const isStreamingYoutube = async channel => {
	try {
		const { body: { items }, statusCode } = await fetch.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel}&type=video&eventType=live&key=${auth.tokens.googleAPI}`);
		const item = items[0];
		if (statusCode === 200 && item && item.snippet.liveBroadcastContent === "live") {
			return {
				name: item.snippet.channelTitle,
				type: "YouTube",
				game: item.snippet.title,
				url: `https://youtube.com/watch?v=${item.id.videoId}`,
				preview: item.snippet.thumbnails.high.url,
				invalid: false,
				error: null,
			};
		} else {
			return {
				invalid: true,
				error: null,
			};
		}
	} catch (err) {
		if (err.statusCode === 404) {
			return {
				invalid: true,
				error: null,
			};
		}
		return {
			invalid: true,
			error: err,
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
