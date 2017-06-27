const auth = require("./../Configuration/auth.json");

module.exports = require("currency-converter")({
  CLIENTKEY: auth.tokens.openexchangerates_key
});
