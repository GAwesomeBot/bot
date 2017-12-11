const cJSON = require("circular-json");
// Unused imports
// const ProcessAsPromised = require("process-as-promised");
// const EventEmitter = require("events");

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
				return this.sharder.broadcast(subject, cJSON.stringify(payload), timeout);
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

// Unused? Gilbert, delete these if not needed
// class ShardIPC extends EventEmitter {
// 	constructor (client, winston, process) {
// 		super();
// 		this.shardClient = client.shard;
// 		this.winston = winston;
// 		this.process = new ProcessAsPromised(process);
// 		this.client = client;
// 		this.setMaxListeners(0);
// 	}

// 	listen () {
// 		this.winston.verbose("Started shard listener.");
// 		this.process.on("message", msg => {
// 			try {
// 				this.winston.silly("Received message from sharder.", { msg: msg });
// 				if (msg._Eval) {
// 					let result = this.client._eval(msg._Eval);
// 					if (result instanceof Map) result = Array.from(result.entries());
// 					this.shardClient.send({ _Eval: msg._Eval, _result: result });
// 				}
// 				let payload = msg;
// 				if (typeof msg === "string") payload = cJSON.parse(msg);
// 				this.emit(payload.subject, payload);
// 			} catch (err) {
// 				if (!msg._Eval && !msg._SEval) this.winston.warn("Unable to handle message from master :C\n", err);
// 			}
// 		});
// 	}
// }

module.exports = SharderIPC;
