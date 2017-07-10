const auth = require("./../Configuration/auth.json");
const unirest = require("unirest");

const isStreamingTwitch = (username, callback) => {
	unirest.get(`https://api.twitch.tv/kraken/streams/${username}?client_id=${auth.tokens.twitch_client_id}`).header("Accept", "application/json").end(res => {
		if(res.status == 200 && res.body && res.body.stream) {
			callback({
				name: res.body.stream.channel.display_name,
				type: "Twitch",
				game: res.body.stream.game,
				url: res.body.stream.channel.url
			});
		} else {
			callback();
		}
	});
};

const isStreamingYoutube = (channel, callback) => {
	unirest.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channel}&type=video&eventType=live&key=${auth.tokens.google_api_key}`).header("Accept", "application/json").end(res => {
		if(res.status == 200 && res.body && res.body.items.length > 0 && res.body.items[0].snippet.liveBroadcastContent == "live") {
			callback({
				name: res.body.items[0].snippet.channelTitle,
				type: "YouTube",
				game: res.body.items[0].snippet.title,
				url: `https://www.youtube.com/watch?v=${res.body.items[0].id.videoId}`
			});
		} else {
			callback();
		}
	});
};

// Gets live data from Twitch and YTG
module.exports = (type, username, callback) => {
	username = encodeURIComponent(username);
	switch(type) {
		case "twitch":
			isStreamingTwitch(username, callback);
			break;
		case "ytg":
			isStreamingYoutube(username, callback);
			break;
	}
};
