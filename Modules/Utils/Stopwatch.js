const { performance } = require("perf_hooks");

module.exports = class Stopwatch {
	constructor () {
		this._start = performance.now();

		this._end = null;
	}

	get running () {
		return Boolean(!this._end);
	}

	get duration () {
		return this._end ? this._end - this._start : performance.now() - this._start;
	}

	get friendlyDuration () {
		const time = this.duration;
		if (time >= 1000) return `${(time / 1000).toFixed(2)}s`;
		if (time >= 1) return `${time.toFixed(2)}ms`;
		return `${(time * 1000).toFixed(2)}μs`;
	}

	toString () {
		return this.friendlyDuration;
	}

	restart () {
		this._start = performance.now();
		this._end = this._start;
		return this;
	}

	start () {
		if (!this.running) {
			this._start = performance.now() - this.duration;
			this._end = null;
		}
		return this;
	}

	stop () {
		if (this.running) this._end = performance.now();
		return this;
	}
};
