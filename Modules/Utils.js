const requestPromise = require("request-promise-native").defaults({
	resolveWithFullResponse: true,
});

// TODO: Move all utilities here

module.exports = {
	rp: requestPromise,
	request: requestPromise
};
