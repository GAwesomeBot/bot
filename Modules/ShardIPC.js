const EventEmitter = require("events");

class SharderIPC extends EventEmitter {
	constructor (sharder, winston) {
		super();
		this.sharder = sharder;
		this.winston = winston;
	}

	listen () {
		this.winston.verbose("Launched sharder listener.");
		this.sharder.on("message", (shard, msg) => {
			this.winston.debug("Recieved message from shard.", { msg: msg, shard: shard.id });
			try {
				const payload = JSON.parse(msg);
				this.emit(payload.subject, payload, shard.id);
			} catch (err) {
				if (!msg._Eval && !msg.sEval) this.winston.warn("Unable to handle message from shard :C\n", { msg: msg, shard: shard.id, err: err });
			}
		});
	}

	send (subject, payload, shard) {
		try {
			this.winston.debug("Sending message to shard", { subject: subject, payload: payload, shard: shard });
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
	constructor (client, winston, proc) {
		super();
		this.shardClient = client.shard;
		this.winston = winston;
		this.proc = proc;
		this.client = client;
	}

	listen () {
		this.winston.verbose("Launched shard listener.");
		this.proc.on("message", msg => {
			try {
				this.winston.debug("Recieved message from sharder.", { msg: msg });
				if (msg._Eval) {
					let result = this.client._eval(msg._Eval);
					if (result instanceof Map) result = Array.from(result.entries());
					this.shardClient.send({ _Eval: msg._Eval, _result: result });
				}
				const payload = JSON.parse(payload);
				this.emit(payload.subject, payload);
			} catch (err) {
				if (!msg._Eval && !msg._SEval) this.winston.warn("Unable to handle message from master :C\n", { msg: msg, err: err });
			}
		});
	}

	send (subject, payload) {
		try {
			this.winston.debug("Sending message to master", { subject: subject, payload: payload });
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
