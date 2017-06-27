// Get bot client from appropriate platform library
const S = require("string");

module.exports = (db, auth, config) => {
	return require(`./${S(config.platform).capitalize().s}.js`)(db, auth, config);
};
