class SharderIPC {
	constructor (sharder, logger) {
		this.sharder = sharder;
		this.logger = logger;
		this.onEvents = new Map();
		this.onceEvents = new Map();
	}

	send (subject, payload, shard, timeout) {
		try {
			this.logger.silly("Sending message to shard", { subject: subject, payload: payload, shard: shard });

			if (shard === "*") {
				return this.sharder.broadcast(subject, payload, timeout);
			} else {
				shard = this.sharder.shards.get(shard);
				if (!shard) shard = this.sharder.shards.get(0);
				return shard.send(subject, payload, timeout);
			}
		} catch (err) {
			this.logger.warn("Failed to send message to shard :C\n", { subject: subject, payload: payload, shard: shard }, err);
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
			const ID = target === "*" ? target : this.sharder.IPC.shard(target);
			if (this.sharder.shards.has(ID)) return callback(await this.send(event, msg, ID));
			return callback({});
		});
	}

	shard (guildID) {
		try {
			// We have to avoid BigInt syntax because it's too flashy and experimental for eslint.
			// eslint-disable-next-line no-undef,no-bitwise
			return Math.abs(Number((BigInt(guildID) >> BigInt(22)) % BigInt(this.sharder.count)));
		} catch (_) {
			return undefined;
		}
	}
}

module.exports = SharderIPC;
