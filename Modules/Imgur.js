const request = require("snekfetch");

const apiURL = "https://api.imgur.com/3/";

module.exports = class Imgur {
	constructor (clientID) {
		this.clientID = clientID;
	}

	async uploadUrl (url, albumID) {
		const form = {
			type: "URL",
			image: url,
		};
		if (albumID) {
			form.album = albumID;
		}
		const res = await this._createRequest("post", "image", form);
		return {
			status: res.statusCode,
			body: res.body,
			data: res.body.data,
			raw: res,
		};
	}

	async createAlbum () {
		const res = await this._createRequest("post", "album");
		return {
			status: res.statusCode,
			body: res.body,
			data: res.body.data,
			raw: res,
		};
	}

	async getCredits () {
		const res = await this._createRequest("get", "credits");
		return {
			status: res.statusCode,
			body: res.body,
			data: res.body.data,
			raw: res,
		};
	}

	_createRequest (method, path, form) {
		const req = request[method](`${apiURL}${path}`)
			.set({
				Authorization: `Client-ID ${this.clientID}`,
			});
		for (const [key, value] of Object.entries(form)) {
			req.attach(key, value);
		}
		return req;
	}
};
