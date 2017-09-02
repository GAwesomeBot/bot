const Base = require("./Base");

/**
 * An Interval that can repeat with a timeout thats larger than 24.8 days
 * @extends Base
 */
module.exports = class Interval extends Base {
	constructor (listener, after) {
		super(listener, after);
		this.timeLeft = this.after;
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
		if (this.timeLeft <= this.MAX) {
			this.timeout = setTimeout(() => {
				this.listener();
				this.timeLeft = this.after;
				this.start();
			}, this.timeLeft);
		} else {
			this.timeout = setTimeout(() => {
				this.timeLeft -= this.MAX;
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
