const auth = require("./../Configuration/auth.json");
const unirest = require("unirest");

// Search for a GIF on Giphy
module.exports = (query, rating, callback) => {
	unirest.get(`http://api.giphy.com/v1/gifs/random?api_key=${auth.tokens.giphy_api_key}&rating=${rating}&format=json&limit=1&tag=${encodeURIComponent(query)}`).header("Accept", "application/json").end(res => {
		if(res.status == 200 && res.body && res.body.data) {
			callback(res.body.data.url);
		} else {
			callback();
		}
	});
};
