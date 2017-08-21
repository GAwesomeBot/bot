const auth = require("../Configurations/auth.js");
const MSTranslator = require("mstranslator");

module.exports = new MSTranslator({
	api_key: auth.tokens.microsoftTranslation,
}, true);
