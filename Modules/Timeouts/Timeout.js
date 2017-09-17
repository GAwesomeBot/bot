const Base = require("./Base");

/**
 * A Timeout that can wait for longer than 24.8 days before running.
 * Use {@link Interval} for Intervals
 * @extends Base
 */
module.exports = class Timeout extends Base {
	constructor (listener, after) {
		super(listener, after);
		this.start();
	}

	start () {
		if (this.after <= this.MAX) {
			this.timeout = setTimeout(this.listener, this.after);
		} else {
			this.timeout = setTimeout(() => {
				this.after -= this.MAX;
				this.start();
			}, this.MAX);
		}

		if (this.unreffed) {
			this.timeout.unref();
		}
	}
};
