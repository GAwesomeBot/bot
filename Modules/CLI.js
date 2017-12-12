class CLI {
    constructor(db, client) {
        this.db = db;
        this.bot = this.client = client;
        this.stdin = process.stdin;
    }

    setup() {
        // TODO: this
    }
}

module.exports = CLI;