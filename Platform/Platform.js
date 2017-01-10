// Get bot client from appropriate platform library
module.exports = (db, auth, config) => {
	return require(`./${config.platform.charAt(0).toUpperCase()}${config.platform.slice(1)}.js`)(db, auth, config);
};