/* eslint-disable max-len */
const auth = require("../../Configurations/auth.js");
const fetch = require("chainfetch");

const isStreamingTwitch = async (username, strict) => {
	try {
		if (strict) await fetch.get(`https://api.twitch.tv/kraken/channels/${encodeURIComponent(username)}?client_id=${auth.tokens.twitchClientID}`);
		const { body: { stream }, status } = await fetch.get(`https://api.twitch.tv/kraken/streams/${encodeURIComponent(username)}?client_id=${auth.tokens.twitchClientID}`);
		if (status === 200 && stream) {
			return {
				name: stream.channel.display_name,
				type: "Twitch",
				game: stream.game,
				url: stream.channel.url,
				streamerImage: stream.channel.logo,
				preview: stream.preview.large,
				streaming: true,
				invalid: false,
				error: null,
			};
		} else if (status === 200 && !stream) {
			return {
				streaming: false,
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
		if (err.status === 404) {
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

const getYoutubeID = async username => {
	try {
		const { body: { items }, status } = await fetch.get(`https://www.googleapis.com/youtube/v3/channels?forUsername=${encodeURIComponent(username)}&part=id&key=${auth.tokens.googleAPI}`);
		if (!items || status !== 200) return null;
		const channel = items[0];
		if (!channel) return null;
		return channel.id;
	} catch (err) {
		return null;
	}
};

const isStreamingYoutube = async channel => {
	try {
		const channelId = await getYoutubeID(channel) || channel;
		const { body: { items }, status } = await fetch.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&type=video&eventType=live&key=${auth.tokens.googleAPI}`);
		const item = items[0];
		if (status === 200 && item && item.snippet.liveBroadcastContent === "live") {
			return {
				name: item.snippet.channelTitle,
				type: "YouTube",
				game: item.snippet.title,
				url: `https://youtube.com/watch?v=${item.id.videoId}`,
				preview: item.snippet.thumbnails.high.url,
				streaming: true,
				invalid: false,
				error: null,
			};
		} else if (status === 200 && !item) {
			return {
				streaming: false,
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
		if (err.status === 404) {
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

const isStreamingMixer = async username => {
	try {
		const { body: stream, status } = await fetch.get(`https://mixer.com/api/v1/channels/${encodeURIComponent(username)}`);
		if (status === 200 && stream) {
			return {
				name: stream.user.username,
				type: "Mixer",
				game: stream.type.name,
				url: `https://mixer.com/${stream.token}`,
				streamerImage: stream.user.avatarUrl,
				preview: stream.thumbnail && stream.thumbnail.url,
				streaming: true,
				invalid: false,
				error: null,
			};
		} else if (status === 200 && !stream) {
			return {
				streaming: false,
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
		if (err.status === 404) {
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

module.exports = async (type, username, strict) => {
	username = encodeURIComponent(username);
	switch (type) {
		case "twitch": {
			return isStreamingTwitch(username, !!strict);
		}
		case "ytg": {
			return isStreamingYoutube(username);
		}
		case "mixer": {
			return isStreamingMixer(username);
		}
	}
};
