const RegExpMaker = require("./RegExpMaker.js");
const { discord, tokens } = require("../../Configurations/auth.js");
const { gistKey } = tokens;

module.exports = class GitHubGist {
	constructor (bot) {
		this.bot = bot;
		this.token = gistKey;
		this.public = this.token === "";
		this.headers = {
			"User-Agent": "GAwesomeBot (https://github.com/GilbertGobbels/GAwesomeBot)",
		};
		if (this.token !== "") this.headers.Authorization = `Token ${this.token}`;
		this.apiURL = "https://api.github.com/gists";
	}

	/**
	 * Uploads text to GitHub Gist
	 * @param {Object} [options] The text object
	 * @param {String} [options.title] Optional title for the Gist
	 * @param {String} options.text The content of the Gist
	 * @returns {Object} Object containing the id and the url to the Gist
	 */
	async upload ({ title, text } = {}) {
		const censor = [
			discord.clientID,
			discord.clientSecret,
			discord.clientToken,
			tokens.carboniteEx,
			tokens.discordList,
			tokens.discordBots,
			tokens.giphyAPI,
			tokens.googleCSEID,
			tokens.googleAPI,
			tokens.imgurClientID,
			tokens.microsoftTranslation,
			tokens.twitchClientID,
			tokens.wolframAppID,
			tokens.openExchangeRatesKey,
			tokens.omdbAPI,
			tokens.gistKey,
		];
		const regExp = new RegExpMaker(censor).make("gi");
		let res;
		try {
			res = await rp.post({
				uri: this.apiURL,
				headers: this.headers,
				json: true,
				body: {
					description: `GAwesomeBot (${this.bot.user.tag} | ${this.bot.user.id})${title ? ` | ${title}` : ""}`,
					public: this.public,
					files: {
						"text.md": {
							content: text.replace(regExp, "(╯°□°）╯︵ ┻━┻"),
						},
					},
				},
			});
		} catch (err) {
			throw err;
		}
		return {
			id: res.body.id,
			url: res.body.html_url,
		};
	}

	async delete (id) {
		let res;
		try {
			res = await rp.delete({
				uri: `${this.apiURL}/${id}`,
				headers: this.headers,
			});
		} catch (err) {
			throw err;
		}
		return {
			deleted: res.statusCode === 204,
		};
	}
};
