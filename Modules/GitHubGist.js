/*
 * Uploads text to GitHub Gist
 * Upload for uploads
 * Delete for deletes
 * @returns Object with the Gist ID and the direct HTML URL
 */

/* eslint-disable max-len, indent, arrow-body-style */

const rp = require("request-promise-native").defaults({
  resolveWithFullResponse: true,
});
const auth = require("./../Configuration/auth.json");

const github = {
  upload: async (bot, text) => {
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
          description: `GAwesomeBot (${bot.user.username}#${bot.user.discriminator} | ${bot.user.id}) Gist`,
          public: false,
          files: {
            "text.md": {
              content: text,
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

exports.upload = github.upload;
exports.delete = github.delete;
