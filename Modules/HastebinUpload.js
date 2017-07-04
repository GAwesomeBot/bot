const unirest = require("unirest");

/* Uploads text to Hastebin
 * Callback will return the normal URL, optionally the RAW url as the second parameter
 * of the callback
 */
/* eslint-disable indent */
module.exports = (type, query) => {
  if (!query) {
    query = type;
    type = "n";
  }
  return new Promise((resolve, reject) => {
    if (["r", "raw", "n", "normal"].includes(type.toLowerCase())) {
      unirest.post("https://www.hastebin.com/documents").send(query).end(res => {
        if (res.status === 200 && res.body.key) {
          switch (type.toLowerCase()) {
            case "r":
            case "raw":
              resolve(`https://www.hastebin.com/raw/${res.body.key}`);
              break;
            case "n":
            case "normal":
              resolve(`https://www.hastebin.com/${res.body.key}`);
              break;
            default:
              resolve(`https://www.hastebin.com/${res.body.key}`);
          }
        } else {
          reject(new Error("Couldn't upload to Hastebin, try again later!"));
        }
      });
    } else {
      reject(new TypeError(`Type must be either "r", "raw", "n" or "normal" (case insensitive). Received ${type} instead.`));
    }
  });
};
