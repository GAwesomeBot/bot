const cluster = require("cluster");
const EventEmitter = require("events");

class Shard {
	constructor (id, proc, sharder, worker) {
		this.process = proc;
		this.sharder = sharder;
		this.worker = worker;
		this.id = id;
		this.winston = sharder.winston;

		this.process.once("exit", () => {
			this.winston.verbose(`Shard ${this.id} peacefully passed away. Respawning...`, { id: this.id });
			this.sharder.create(this.id);
		});

		this.process.on("message", msg => {
			if (msg) {
				if (msg._SEval) {
					this.sharder.broadcastEval(msg._SEval).then(
						results => this.send({ _SEval: msg._SEval, _result: results }),
						err => this.send({ _SEval: msg._SEval, _error: err })
					);
					return;
				}
			}
			if (!msg._SEval) this.sharder.emit("message", this, msg);
		});
	}

	send (msg) {
		return new Promise((resolve, reject) => {
			this.process.send(msg, err => {
				if (err) reject(err); else resolve();
			});
		});
	}

	eval (code) {
		this.winston.silly("Evaluating code on shard", { code: code });
		const promise = new Promise((resolve, reject) => {
			const listener = message => {
				if (!message || message._Eval !== code) return;
				this.winston.silly("Recieved eval reply from shard!", { message: message });
				this.process.removeListener("message", listener);
				resolve(message._result);
			};
			this.process.on("message", listener);

			this.send({ _Eval: code }).catch(err => {
				this.process.removeListener("message", listener);
				reject(err);
			});
		});
		return promise;
	}
}

class Sharder extends EventEmitter {
	constructor (token, count, winston) {
		super();
		this.cluster = cluster;
		this.cluster.setupMaster({
			exec: "Discord.js",
		});
		this.winston = winston;
		this.token = token;
		this.count = count;
		this.SharderIPC = require("./").SharderIPC;
		this.Collection = require("discord.js").Collection;
		this.IPC = new this.SharderIPC(this, winston);
		this.shards = new this.Collection();
	}

	spawn () {
		this.winston.verbose("Spawning shards.");
		for (let i = 0; i < this.count; i++) {
			this.create(i);
		}
	}

	create (id) {
		this.winston.silly("Creating new shard instance and process.", { id: id });
		let worker = this.cluster.fork({
			CLIENT_TOKEN: this.token,
			SHARD_ID: id,
			SHARD_COUNT: this.count,
		});
		let shard = new Shard(id, worker.process, this, worker);
		this.shards.set(id, shard);
	}

	broadcast (message) {
		this.winston.verbose("Broadcasting message to all shards.", { msg: message });
		const promises = [];
		for (const shard of this.shards.values()) promises.push(shard.send(message));
		return Promise.all(promises);
	}

	broadcastEval (val) {
		this.winston.verbose("Broadcasting eval to all shards.", { code: val });
		const promises = [];
		for (const shard of this.shards.values()) promises.push(shard.eval(val));
		return Promise.all(promises);
	}
}

module.exports = Sharder;
