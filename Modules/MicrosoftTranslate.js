const auth = require("./../Configuration/auth.json");
const MsTranslator = require('mstranslator');

module.exports = new MsTranslator({
	api_key: auth.tokens.microsoft_cs_key
}, true);
