const crypto = require("crypto");

class Traffic {
	constructor (IPC, isWorker) {
		this.db = Database;
		this.IPC = IPC;
		this.winston = winston;

		this.pageViews = 0;
		this.authViews = 0;
		this.uniqueUsers = 0;
		this.TID = crypto.randomBytes(32).toString("hex");

		if (!isWorker) setInterval(this.fetch.bind(this), 3600000);
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
		this.TID = crypto.randomBytes(32).toString("hex");
		return res;
	}

	async flush () {
		this.winston.verbose(`Flushing traffic data to DB`);
		this.db.traffic.create({
			_id: Date.now(),
			pageViews: this.pageViews,
			authViews: this.authViews,
			uniqueUsers: this.uniqueUsers,
		});
		this.db.traffic.remove({ _id: { $lt: Date.now() - 2629746000 } }).exec();
	}

	async fetch () {
		this.winston.debug(`Fetching traffic data`);
		this.IPC.send("traffic", {}, "*").then(msg => {
			let payload = msg.reduce((val, oldVal) => ({
				pageViews: val.pageViews + oldVal.pageViews,
				authViews: val.authViews + oldVal.authViews,
				uniqueUsers: val.uniqueUsers + oldVal.uniqueUsers,
			}));
			this.winston.silly(`Fetched traffic data: `, payload);
			this.pageViews = payload.pageViews;
			this.authViews = payload.authViews;
			this.uniqueUsers = payload.uniqueUsers;
			this.flush();
		});
	}

	async count (TID, authenticated) {
		this.pageViews++;
		if (authenticated) this.authViews++;
		if (!TID || TID !== this.TID) this.uniqueUsers++;
	}

	async data () {
		let data = {};
		data.hour = this.pageViews;
		if (!this.db.traffic) this.db = this.db.get();
		const rawData = await this.db.traffic.find().exec();
		data.day = rawData.filter(traffic => (Date.now() - 86400000) < traffic._id);
		data.days = {};
		rawData.forEach(traffic => {
			let day = new Date(traffic._id).getDate();
			if (!data.days[day]) {
				data.days[day] = traffic;
			} else {
				data.days[day].pageViews += traffic.pageViews;
				data.days[day].authViews += traffic.authViews;
				data.days[day].uniqueUsers += traffic.uniqueUsers;
			}
		});
		data.week = Object.values(data.days).filter(traffic => (Date.now() - 604800000) < traffic._id);
		return data;
	}

	// Temp
	init () {
		return true;
	}
}

module.exports = Traffic;
