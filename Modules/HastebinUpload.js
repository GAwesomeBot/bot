const unirest = require("unirest");

/* Uploads text to Hastebin
 * type Optional parameter, can choose betweeen "r", "raw", "n" and "normal"
 * Decides what to return in the .then()
 */
/* eslint-disable indent */
module.exports = (type, query) => {
  if (!query) {
    query = type;
    type = "n";
  }
  return new Promise((resolve, reject) => {
    if (["r", "raw", "n", "normal"].includes(type.toLowerCase())) {
      unirest.post("https://hastebin.com/documents").send(query).end(res => {
        if (res.status === 200 && res.body.key) {
          switch (type.toLowerCase()) {
            case "r":
            case "raw":
              resolve(`https://hastebin.com/raw/${res.body.key}`);
              break;
            case "n":
            case "normal":
              resolve(`https://hastebin.com/${res.body.key}`);
              break;
            default:
              resolve(`https://hastebin.com/${res.body.key}`);
          }
        } else {
          reject(Error("Couldn't upload to hastebin, try again later!"));
        }
      });
    } else {
      reject(TypeError(`Type must be either "r", "raw", "n" or "normal" (case insensitive). Received ${type} instead.`));
    }
  });
};
