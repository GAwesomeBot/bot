/**
 * Heavily inspired from Discord.js's Error code, which in turn is inspired from Node's `internal/errors` module
 */
const kCode = Symbol("code");
const messages = new Map();

/**
 * Extend an error of some sort into a GABError
 */

const makeGABError = base => class GABError extends base {
	constructor (key, ...args) {
		super(message(key, args));
		this[kCode] = key;
		if (Error.captureStackTrace) Error.captureStackTrace(this, GABError);
	}

	get name () {
		return `${super.name} [${this[kCode]}]`;
	}

	get code () {
		return this[kCode];
	}
};

/**
 * Formats the message into an error.
 * @param {String} key Error key
 * @param {*[]} args Arguments to pass for util format or as function args
 * @returns {String} The formatted string
 */
function message (key, args) {
	if (typeof key !== "string") throw new Error("Error message key must be a string");
	const msg = messages.get(key);
	if (!msg) throw new Error(`An invalid error message key was used: ${key}.`);
	if (typeof msg === "function") return msg(...args);
	if (args === undefined || args.length === 0) return msg;
	args.unshift(msg);
	return String(...args);
}

/**
 * Register an error code and message.
 * @param {string} sym Unique name for the error
 * @param {Function|String} val Value of the error
 */
exports.register = (sym, val) => {
	messages.set(sym, typeof val === "function" ? val : String(val));
};

exports.Error = makeGABError(Error);
exports.TypeError = makeGABError(TypeError);
exports.RangeError = makeGABError(RangeError);
