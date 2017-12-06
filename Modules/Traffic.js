class Traffic {
	constructor (db, IPC, winston, isWorker) {
		this.db = db;
		this.IPC = IPC;
		this.winston = winston;

		this.pageViews = 0;
		this.authViews = 0;
		this.uniqueUsers = 0;

		if (!isWorker) setInterval(this.fetch.bind(this), 30000);
	}

	get get () {
		let res = {
			pageViews: this.pageViews,
			authViews: this.authViews,
			uniqueUsers: this.uniqueUsers,
		};
		this.pageViews = 0;
		this.authViews = 0;
		this.uniqueUsers = 0;
		return res;
	}

	flush () {
		this.winston.info(`Flushing traffic data`);
		this.db.traffic.create({
			timestamp: Date.now(),
			pageViews: this.pageViews,
			authViews: this.authViews,
			uniqueUsers: this.uniqueUsers,
		});
	}

	fetch () {
		this.winston.info(`Fetching traffic data`);
		this.IPC.send("traffic", {}, "*").then(msg => {
			let payload = msg.reduce((val, oldVal) => ({
				pageViews: val.pageViews + oldVal.pageViews,
				authViews: val.authViews + oldVal.authViews,
				uniqueUsers: val.uniqueUsers + oldVal.uniqueUsers,
			}));
			this.winston.info(`Fetched traffic data: `, payload);
			this.pageViews = payload.pageViews;
			this.authViews = payload.authViews;
			this.uniqueUsers = payload.uniqueUsers;
			this.flush();
		});
	}

	async count (UID, authenticated) {
		this.pageViews++;
		if (authenticated) this.authViews++;
		if (!UID) this.uniqueUsers++;
	}
	// Temp
	init () {
		return true;
	}
}

module.exports = Traffic;
