const crypto = require("crypto");

class Traffic {
	constructor (IPC, isWorker) {
		this.db = Database;
		this.IPC = IPC;
		this.logger = logger;

		this.pageViews = 0;
		this.authViews = 0;
		this.uniqueUsers = 0;
		this.TID = crypto.randomBytes(32).toString("hex");

		if (!isWorker) setInterval(this.fetch.bind(this), 3600000);
	}

	get get () {
		const res = {
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
		this.logger.verbose(`Flushing traffic data to DB.`);
		await this.db.traffic.create({
			_id: Date.now(),
			pageViews: this.pageViews,
			authViews: this.authViews,
			uniqueUsers: this.uniqueUsers,
		});
		await this.db.traffic.delete({ _id: { $lt: Date.now() - 2629746000 } });
	}

	async fetch () {
		this.logger.debug(`Fetching traffic data.`);
		const msg = await this.IPC.send("traffic", {}, "*");
		const payload = msg.reduce((val, oldVal) => ({
			pageViews: val.pageViews + oldVal.pageViews,
			authViews: val.authViews + oldVal.authViews,
			uniqueUsers: val.uniqueUsers + oldVal.uniqueUsers,
		}));
		this.logger.silly(`Fetched traffic data: `, payload);
		this.pageViews = payload.pageViews;
		this.authViews = payload.authViews;
		this.uniqueUsers = payload.uniqueUsers;
		this.flush();
	}

	async count (TID, authenticated) {
		this.pageViews++;
		if (authenticated) this.authViews++;
		if (!TID || TID !== this.TID) this.uniqueUsers++;
	}

	async data () {
		const data = {};
		data.hour = this.pageViews;
		const rawData = await this.db.traffic.find({}).exec();
		data.day = rawData.filter(traffic => (Date.now() - 86400000) < traffic._id);
		data.days = {};
		rawData.forEach(traffic => {
			const day = new Date(traffic._id).getDate();
			if (!data.days[day]) {
				data.days[day] = traffic.toObject();
			} else {
				data.days[day].pageViews += traffic.pageViews;
				data.days[day].authViews += traffic.authViews;
				data.days[day].uniqueUsers += traffic.uniqueUsers;
			}
		});
		data.week = Object.values(data.days).filter(traffic => (Date.now() - 604800000) < traffic._id);
		return data;
	}
}

module.exports = Traffic;
