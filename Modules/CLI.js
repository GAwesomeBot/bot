class CLI {
	constructor (db, client) {
		this.db = db;
		this.bot = this.client = client;
		this.stdin = process.stdin;
	}

	/*
	* Sets up all the stuff we need
	* @returns {CLI}
	*/
	setup () {
		this.stdin.on("data", this.listener.bind(this));
		return this;
	}

	/*
	* Disposes (destroys) all the CLI things.
	* @returns {CLI]*/
	dispose () {
		this.stdin.removeListener("data", this.listener.bind(this));
	}

	/*
	* Listens to the incoming events from stdin
	* @param {Buffer} data The incoming data from the stdin*/
	// No WebStorm, it can't be static
	// noinspection JSMethodCanBeStatic
	// eslint-disable-next-line no-empty-function
	listener (data) {
		const strData = data.toString(); // eslint-disable-line no-unused-vars
	}
}

module.exports = CLI;
