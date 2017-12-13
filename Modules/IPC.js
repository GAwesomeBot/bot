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
}

module.exports = SharderIPC;
