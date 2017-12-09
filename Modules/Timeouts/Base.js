module.exports = class Base {
	constructor (listener, after, ...args) {
		this.listener = listener;
		this.after = after;
		this.unreffed = false;
		this.args = args;
		/**
		 * Maximum value of a timer, minus 1
		 * Also known as 2^31 - 1
		 * @type {Number}
		 */
		this.MAX = 2147483647;
		this.timeout = null;

		this.startedAt = Date.now();
	}

	unref () {
		if (!this.unreffed) {
			this.unreffed = true;
			this.timeout.unref();
		}
	}

	ref () {
		if (this.unreffed) {
			this.unreffed = false;
			this.timeout.ref();
		}
	}

	close () {
		clearTimeout(this.timeout);
	}
};
