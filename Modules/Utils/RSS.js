const getRSS = require("feed-read");

/**
 * Fetch RSS entries
 * @param {string} url The url of the feed
 * @param {number} num The number of RSS articles to fetch
 * @returns {?array}
 */
module.exports = (url, num) => new Promise((resolve, reject) => {
	const handleError = err => {
		winston.warn(`Failed to process RSS feed request.. :/\n`, err);
		reject(err);
	};

	try {
		getRSS(url, (err, articles) => {
			if (err) {
				winston.debug(`Feed at URL ${url} did not respond with valid RSS.`);
			} else {
				resolve(articles.slice(0, num));
			}
		});
	} catch (err) {
		handleError(err);
	}
});
