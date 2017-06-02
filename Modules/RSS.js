const getRSS = require("feed-read");

// Fetch n entries from an RSS feed
module.exports = (winston, url, num, callback) => {
	if(typeof(callback)=="function") {
		const handleError = err => {
			winston.error("Failed to process RSS feed request", err);
			callback(err);
		};
		try {
			getRSS(url, (err, articles) => {
				if(err) {
					handleError(err);
				} else {
					callback(err, articles.slice(0, num));
				}
			})
		} catch(err) {
			handleError(err);
		}
	}
};
