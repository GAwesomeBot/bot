const cluster = require("cluster");
const ProcessAsPromised = require("process-as-promised");

class Shard {
	constructor (id, proc, sharder, worker) {
		this.process = proc;
		this.sharder = sharder;
		this.worker = worker;
		this.id = id;
		this.logger = sharder.logger;
		this.process.setMaxListeners(0);
		this.IPC = new ProcessAsPromised(this.process);

		this.process.once("exit", () => {
			this.logger.info(`Shard ${this.id} peacefully passed away.${!this.sharder.shutdown ? " Respawning..." : ""}`, { id: this.id });
			if (!this.sharder.shutdown) this.sharder.create(this.id);
		});

		this.sharder.IPC.onEvents.forEach((callback, event) => {
			this.IPC.on(event, (...args) => {
				if (!this.sharder.shutdown) return callback(...args);
			});
		});
		this.sharder.IPC.onceEvents.forEach((callback, event) => this.IPC.once(event, callback));
	}

	send (event, data, timeout) {
		return this.IPC.send(event, data, timeout || undefined);
	}

	// noinspection JSAnnotator
	eval (code) {
		return new Promise(resolve => this.IPC.send("eval", code).then(res => resolve(res)));
	}

	getGuild (guildID, settings) {
		return new Promise((resolve, reject) => {
			this.send("getGuild", { target: guildID, settings: settings }).then(msg => resolve(msg.result)).catch(err => {
				reject(err);
			});
		});
	}

	getGuilds (settings) {
		return new Promise((resolve, reject) => {
			this.send("getGuild", { target: "*", settings: settings }).then(msg => resolve(msg.result)).catch(err => {
				reject(err);
			});
		});
	}
}

class Sharder {
	constructor (token, count, logger) {
		this.cluster = cluster;
		this.cluster.setupMaster({
			exec: "GAwesomeBot.js",
		});
		this.logger = logger;
		this.token = token ? token : process.env.CLIENT_TOKEN;
		this.host = process.env.GAB_HOST ? process.env.GAB_HOST : undefined;
		this.count = count;
		this.mode = process.env.NODE_ENV === "production" ? "production" : "development";
		this.SharderIPC = require("./").SharderIPC;
		this.Collection = require("discord.js").Collection;
		this.IPC = new this.SharderIPC(this, logger);
		this.shards = new this.Collection();
		this.guilds = new this.Collection();
		this.shutdown = false;
	}

	spawn () {
		this.logger.verbose("Spawning shards.");
		for (let i = 0; i < this.count; i++) {
			this.create(i);
		}
	}

	create (id) {
		this.logger.verbose("Creating new shard instance and process.", { id: id });
		const worker = this.cluster.fork({
			CLIENT_TOKEN: this.token,
			SHARDS: id,
			SHARD_COUNT: this.count,
			GAB_HOST: this.host,
			NODE_ENV: this.mode,
		});
		const shard = new Shard(id, worker.process, this, worker);
		this.shards.set(id, shard);
	}

	broadcast (subject, message, timeout) {
		this.logger.silly("Broadcasting message to all shards.", { msg: message });
		const promises = [];
		for (const shard of this.shards.values()) promises.push(shard.send(subject, message, timeout));
		return Promise.all(promises);
	}
}

module.exports = Sharder;
