/* eslint-disable max-len */
const auth = require("../../Configurations/auth.js");
const snekfetch = require("snekfetch");

const isStreamingTwitch = async username => {
	let res;
	try {
		res = await snekfetch.get(`https://api.twitch.tv/kraken/streams/${username}`).set("Accept", "application/json").query("client_id", auth.tokens.twitchClientID);
	} catch (err) {
		throw err;
	}
	if (res.statusCode === 200 && res.body && res.body.stream) {
		return {
			name: res.body.stream.channel.display_name,
			type: "Twitch",
			game: res.body.stream.game,
			url: res.body.stream.channel.url,
		};
	}
};

const isStreamingYoutube = async channel => {
	let res;
	try {
		res = await snekfetch.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel}&type=video&eventType=live&key=${auth.tokens.google_api_key}`).set("Accept", "application/json");
	} catch (err) {
		throw err;
	}
	if (res.statusCode === 200 && res.body && res.body.items.length > 0 && res.body.items[0].snippet.liveBroadcastContent === "live") {
		return {
			name: res.body.items[0].snippet.channelTitle,
			type: "YouTube",
			game: res.body.items[0].snippet.title,
			url: `https://www.youtube.com/watch?v=${res.body.items[0].id.videoId}`,
		};
	}
};

module.exports = (type, username) => new Promise((resolve, reject) => {
	username = encodeURIComponent(username);
	switch (type) {
		case "twitch": {
			isStreamingTwitch(username).then(data => resolve(data)).catch(err => reject(err));
			break;
		}
		case "ytg": {
			isStreamingYoutube(username).then(data => resolve(data)).catch(err => reject(err));
			break;
		}
	}
});
