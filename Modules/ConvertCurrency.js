const { tokens } = require("../Configurations/auth.js");
const { openExchangeRatesKey } = tokens;

module.exports = require("currency-converter")({
	CLIENTKEY: openExchangeRatesKey,
});
