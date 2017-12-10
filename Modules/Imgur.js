const request = require("snekfetch");

module.exports = class Imgur {
	constructor (clientID) {
		this.clientID = clientID;
		this.apiURL = `https://api.imgur.com/3/`;
	}

	async upload (url) {
		let endpoint = `${this.apiURL}upload`;
		const res = await request.post(endpoint)
			.set({
				Authorization: `Client-ID ${this.clientID}`,
			})
			.attach("type", "url")
			.attach("image", url);
		return {
			status: res.status,
			body: res.body,
			_raw: res,
		};
	}
};
