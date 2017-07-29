const requestPromise = require("request-promise-native").defaults({
	resolveWithFullResponse: true,
});

module.exports = () => {
	global.rp = requestPromise;
	global.requestPromise = requestPromise;
};
