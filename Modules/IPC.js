class SharderIPC {
	constructor (sharder, winston) {
		this.sharder = sharder;
		this.winston = winston;
		this.onEvents = new Map();
		this.onceEvents = new Map();
	}

	send (subject, payload, shard, timeout) {
		try {
			this.winston.silly("Sending message to shard", { subject: subject, payload: payload, shard: shard });

			if (shard === "*") {
				return this.sharder.broadcast(subject, payload, timeout);
			} else {
				shard = this.sharder.shards.get(shard);
				if (!shard) shard = this.sharder.shards.get(0);
				return shard.send(subject, payload, timeout);
			}
		} catch (err) {
			this.winston.warn("Failed to send message to shard :C\n", { subject: subject, payload: payload, shard: shard, err: err });
		}
	}

	on (event, callback) {
		this.onEvents.set(event, callback);
	}

	once (event, callback) {
		this.onceEvents.set(event, callback);
	}

	forward (event, prop = "guild") {
		this.onEvents.set(event, async (msg, callback) => {
			const target = prop === "this" ? msg : msg[prop];
			const ID = target === "*" ? target : this.sharder.shard(target);
			if (this.sharder.shards.has(ID)) return callback(await this.send(event, msg, ID));
			return callback({});
		});
	}

	shard (guildID) {
		try {
			return Math.abs((guildID >> 22) % this.sharder.count);
		} catch (_) {
			return undefined;
		}
	}
}

module.exports = SharderIPC;
