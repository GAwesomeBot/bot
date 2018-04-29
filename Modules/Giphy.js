const { get } = require("snekfetch");
const { tokens: { giphyAPI } } = require("../Configurations/auth");
const { APIs } = require("../Internals/Constants");
const { GABError } = require("../Internals/Errors");

/**
 * Fetches a random gif from Giphy
 * @param {String} query
 * @param {?String} [nsfw="pg-13"]
 * @returns {Promise<Object>} Giphy API return
 */
module.exports = async (query, nsfw = "pg-13") => {
	if (!query) throw new GABError("MISSING_GIPHY_QUERY");
	const res = await get(APIs.GIPHY(giphyAPI, query, nsfw));
	if (res.statusCode === 200 && res.body && res.body.data) return res.body.data;
	else throw new GABError("NO_GIPHY_RESULT");
};
