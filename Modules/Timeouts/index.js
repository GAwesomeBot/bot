const Timeout = require("./Timeout");
const Interval = require("./Interval");

exports.setTimeout = (listener, after, ...args) => new Timeout(listener, after, ...args);

exports.setInterval = (listener, after, ...args) => new Interval(listener, after, ...args);

exports.clearTimeout = exports.clearInterval = timer => {
	if (timer && (timer instanceof Timeout || timer instanceof Interval)) timer.close();
};

exports.Timeout = Timeout;
exports.Interval = Interval;
