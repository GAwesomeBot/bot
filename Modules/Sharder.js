const cluster = require("cluster");
const ProcessAsPromised = require("process-as-promised");

class Shard {
	constructor (id, proc, sharder, worker) {
		this.process = proc;
		this.sharder = sharder;
		this.worker = worker;
		this.id = id;
		this.winston = sharder.winston;
		this.process.setMaxListeners(0);
		this.IPC = new ProcessAsPromised(this.process);

		this.process.once("exit", () => {
			this.winston.debug(`Shard ${this.id} peacefully passed away.${!this.sharder.shutdown ? " Respawning..." : ""}`, { id: this.id });
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

	eval (code) {
		return new Promise(resolve => this.IPC.send("eval", code).then(res => resolve(res)));
	}

	getGuild (guildID, settings) {
		return new Promise((resolve, reject) => {
			this.send("getGuild", { guild: guildID, settings: settings }).then(msg => resolve(msg.result)).catch(err => {
				reject(err);
			});
		});
	}

	getGuilds (settings) {
		return new Promise((resolve, reject) => {
			this.send("getGuild", { guild: "*", settings: settings }).then(msg => resolve(msg.result)).catch(err => {
				reject(err);
			});
		});
	}
}

class Sharder {
	constructor (token, count, winston) {
		this.cluster = cluster;
		this.cluster.setupMaster({
			exec: "Discord.js",
		});
		this.winston = winston;
		this.token = token ? token : process.env.CLIENT_TOKEN;
		this.host = process.env.GAB_HOST ? process.env.GAB_HOST : undefined;
		this.count = count;
		this.mode = process.env.NODE_ENV === "production" ? "production" : "development";
		this.SharderIPC = require("./").SharderIPC;
		this.Collection = require("discord.js").Collection;
		this.IPC = new this.SharderIPC(this, winston);
		this.shards = new this.Collection();
		this.guilds = new this.Collection();
		this.shutdown = false;
	}

	spawn () {
		this.winston.verbose("Spawning shards.");
		for (let i = 0; i < this.count; i++) {
			this.create(i);
		}
	}

	create (id) {
		this.winston.verbose("Creating new shard instance and process.", { id: id });
		let worker = this.cluster.fork({
			CLIENT_TOKEN: this.token,
			SHARD_ID: id,
			SHARD_COUNT: this.count,
			GAB_HOST: this.host,
			NODE_ENV: this.mode,
		});
		let shard = new Shard(id, worker.process, this, worker);
		this.shards.set(id, shard);
	}

	broadcast (subject, message, timeout) {
		this.winston.silly("Broadcasting message to all shards.", { msg: message });
		const promises = [];
		for (const shard of this.shards.values()) promises.push(shard.send(subject, message, timeout));
		return Promise.all(promises);
	}
}

module.exports = Sharder;
