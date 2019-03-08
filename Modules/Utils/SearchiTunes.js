const request = require("snekfetch");
const { UserAgent } = require("../../Internals/Constants");

const idKeys = [
	"amgAlbumId",
	"amgArtistId",
	"amgVideoId",
	"id",
	"isbn",
	"upc",
];

const keyInObj = obj => {
	for (let i = 0; i < idKeys.length; i++) {
		if (obj[idKeys[i]]) return true;
	}
	return false;
};

module.exports = async params => {
	params = params || {};
	params.version = 2;
	let res;
	let firstRes = false;
	let URL = "https://itunes.apple.com/search";

	if (keyInObj(params)) {
		URL = "https://itunes.apple.com/lookup";
		firstRes = true;
	}

	try {
		res = await request.get(URL).query(params).set({
			Accept: "application/json",
			"Content-Type": "application/json",
			"User-Agent": UserAgent,
		});
		res.body = JSON.parse(res.body);
	} catch (err) {
		throw err;
	}

	let ret;

	if (res.body && res.body.results) {
		if (!res.body.results.length) {
			throw new Error(`No results!`);
		} else if (firstRes) {
			[ret] = res.body.results;
		} else {
			ret = res.body.results;
		}
	}
	return ret;
};
