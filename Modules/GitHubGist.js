/*
 * Uploads text to GitHub Gist
 * Upload for uploads
 * @returns Object with the Gist ID and the direct HTML URL
 * Delete for deletes
 * @returns Object with boolean `deleted` which is true if the deletion succedded, or false if it didn't
 */
/* eslint-disable max-len, indent, arrow-body-style */

const rp = require("request-promise-native").defaults({
  resolveWithFullResponse: true,
});
const auth = require("./../Configuration/auth.json");

const github = {
  upload: async (bot, text, title = null) => {
    let res;
    try {
      res = await rp.post({
        uri: "https://api.github.com/gists",
        headers: {
          "User-Agent": "GAwesomeBot (https://github.com/GilbertGobbels/GAwesomeBot)",
          Authorization: `Token ${auth.tokens.gist_key}`,
        },
        json: true,
        body: {
          description: `GAwesomeBot (${bot.user.username}#${bot.user.discriminator} | ${bot.user.id}) Gist${title !== null ? ` | ${title}` : ""}`,
          public: false,
          files: {
            "text.md": {
              content: text.replace(new RegExp(`${bot.token}|${auth.platform.login_token}|${auth.platform.client_secret}|${auth.tokens.carbonitex_key}|${auth.tokens.discordlist_key}|${auth.tokens.discordbots_key}|${auth.tokens.giphy_api_key}|${auth.tokens.google_api_key}|${auth.tokens.google_cse_id}|${auth.tokens.imgur_client_id}|${auth.tokens.microsoft_cs_key}|${auth.tokens.twitch_client_id}|${auth.tokens.wolfram_app_id}|${auth.tokens.openexchangerates_key}|${auth.tokens.omdb_api}`, "g"), "(╯°□°）╯︵ ┻━┻"),
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
  },
  delete: async id => {
    let res;
    try {
      res = await rp.delete({
        uri: `https://api.github.com/gists/${id}`,
        headers: {
          "User-Agent": "GAwesomeBot (https://github.com/GilbertGobbels/GAwesomeBot)",
          Authorization: `Token ${auth.tokens.gist_key}`,
        },
      });
    } catch (err) {
      throw err;
    }
    return {
      deleted: res.statusCode === 204,
    };
  },
};

exports = github;
