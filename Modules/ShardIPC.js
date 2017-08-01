// TODO: Uncomment if you are using it.
// const Discord = require("discord.js");
const EventEmitter = require("events");

class SharderIPC extends EventEmitter {
	constructor(sharder, winston) {
		super();
		this.sharder = sharder;
		this.winston = winston;
	}

	listen() {
		this.winston.verbose("Launched sharder listener.");
		this.sharder.on("message", (shard, msg) => {
			this.winston.verbose("Recieved message from shard.", { msg: msg, shard: shard.id });
			try {
				const payload = JSON.parse(msg);
				this.emit(payload.subject, payload, shard.id);
			} catch (err) {
				this.winston.warn("Unable to handle message from shard :C\n", { msg: msg, shard: shard.id, err: err });
			}
		});
	}

	send(subject, payload, shard) {
		try {
			this.winston.verbose("Sending message to shard", { subject: subject, payload: payload, shard: shard });
			payload.subject = subject;

			if (shard === "*") {
				this.sharder.broadcast(JSON.stringify(payload)).catch(err => {
					throw err;
				});
			} else {
				shard = this.sharder.shards.get(shard);
				shard.send(JSON.stringify(payload)).catch(err => {
					throw err;
				});
			}
		} catch (err) {
			this.winston.warn("Failed to send message to shard :C\n", { subject: subject, payload: payload, shard: shard, err: err });
		}
	}
}

class ShardIPC extends EventEmitter {
	constructor(client, winston, proc) {
		super();
		this.shardClient = client.shard;
		this.winston = winston;
		this.proc = proc;
	}

	listen() {
		this.winston.verbose("Launched shard listener.");
		this.proc.on("message", msg => {
			try {
				this.winston.verbose("Recieved message from sharder.", { msg: msg });
				const payload = JSON.parse(payload);
				this.emit(payload.subject, payload);
			} catch (err) {
				this.winston.warn("Unable to handle message from master :C\n", { msg: msg, err: err });
			}
		});
	}

	send(subject, payload) {
		try {
			this.winston.verbose("Sending message to master", { subject: subject, payload: payload });
			payload.subject = subject;
			this.shardClient.send(JSON.stringify(payload));
		} catch (err) {
			this.winston.warn("Failed to send message to master :C\n", { payload: payload, subject: subject, err: err });
		}
	}
}

module.exports = {
	SharderIPC: SharderIPC,
	ShardIPC: ShardIPC,
};
