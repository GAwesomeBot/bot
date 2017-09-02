const Timeout = require("./Timeout");
const Interval = require("./Interval");

exports.setTimeout = (listener, after) => new Timeout(listener, after);

exports.setInterval = (listener, after) => new Interval(listener, after);

exports.clearTimeout = exports.clearInterval = timer => {
	if (timer && (timer instanceof Timeout || timer instanceof Interval)) timer.close();
};

exports.Timeout = Timeout;
exports.Interval = Interval;
