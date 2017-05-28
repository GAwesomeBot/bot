const unirest = require("unirest");

/* Uploads text to Hastebin
 * Callback will return the normal URL, optionally the RAW url as the second parameter
 * of the callback
 */
/* eslint-disable indent */
module.exports = (query, callback) => {
  unirest.post("https://hastebin.com/documents").send(query).end(res => {
    if (res.status === 200 && res.body.key) {
      return callback(`https://hastebin.com/${res.body.key}`, `https://hastebin.com/raw/${res.body.key}`);
    } else {
      return callback(`https://hastebin.com/`);
    }
  });
};
