const Base = require("./Base");

/**
 * An Interval that can repeat with a timeout thats larger than 24.8 days
 * @extends Base
 */
module.exports = class Interval extends Base {
	constructor (listener, after, ...args) {
		super(listener, after, ...args);
		this.timeLeft = this.after;
		this.start();
	}

	start () {
		if (this.timeLeft <= this.MAX) {
			this.timeout = setTimeout(() => {
				this.listener(...this.args);
				this.timeLeft = this.after;
				this.startedAt = Date.now();
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
};
