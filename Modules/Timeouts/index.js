/* eslint node/exports-style: ["error", "exports"] */

const Timeout = require("./Timeout");
const Interval = require("./Interval");

exports.setTimeout = (listener, after, key, ...args) => new Timeout(listener, after, key, ...args);

exports.setInterval = (listener, after, key, ...args) => new Interval(listener, after, key, ...args);

exports.clearTimeout = exports.clearInterval = timer => {
	if (timer && (timer instanceof Timeout || timer instanceof Interval)) timer.close();
};

exports.Timeout = Timeout;
exports.Interval = Interval;
