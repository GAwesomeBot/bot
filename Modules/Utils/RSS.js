const Parser = require("rss-parser");
const parser = new Parser({ timeout: 2000 });


/**
 * Fetch RSS entries
 * @param {string} url The url of the feed
 * @param {number} num The number of RSS articles to fetch
 * @returns {?array}
 */
module.exports = (url, num) => new Promise((resolve, reject) => {
	parser.parseURL(url).then(articles => resolve(articles && articles.items ? articles.items.slice(0, num) : [])).catch(err => {
		logger.debug(`Feed at URL ${url} did not respond with valid RSS.`, { url }, err);
		reject("invalid");
	});
});
