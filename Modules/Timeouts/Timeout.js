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

	close () {
		clearTimeout(this.timeout);
	}
};
