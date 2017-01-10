const auth = require("./../Configuration/auth.json");

module.exports = require("bing-translate").init({
	client_id: auth.tokens.microsoft_client_id,
	client_secret: auth.tokens.microsoft_client_secret
}).translate;
