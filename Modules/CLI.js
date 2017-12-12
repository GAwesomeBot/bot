class CLI {
	constructor (db, client) {
		this.db = db;
		this.bot = this.client = client;
		this.stdin = process.stdin;
	}

	setup () {
		this.stdin.on("data", this.listener.bind(this));
	}

	dispose () {
		this.stdin.removeListener("data", this.listener.bind(this));
	}

	// eslint-disable-next-line no-empty-function
	listener () {

	}
}

module.exports = CLI;
