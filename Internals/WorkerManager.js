const { Error } = require("./Errors/");
const { WorkerTypes } = require("./Constants");
const processAsPromised = require("process-as-promised");
const { fork } = require("child_process");

class WorkerManager {
	constructor (client) {
		this.client = client;

		// Fork of the child process responsible for running extensions
		this.worker = null;
	}

	async getValueFromWorker (workerType, { data, command = null } = {}) {
		switch (workerType) {
			case WorkerTypes.MATH: {
				return this._getMathJSResult(command, data);
			}
			default: {
				throw new Error("CHILD_PROCESS_TYPE_INVALID", workerType);
			}
		}
	}

	async _getMathJSResult (command, requestedInfo) {
		if (!command) throw new Error("CHILD_PROCESS_MISSING_PROPERTY", "command");
		if (!requestedInfo) throw new Error("CHILD_PROCESS_MISSING_PROPERTY", "The information");
		const res = await this.worker.send("runMathCommand", { command, info: requestedInfo });
		if (res.error) throw res.error;
		else return res.result;
	}

	async startWorker () {
		this.worker = new processAsPromised(fork(`${__dirname}/Worker.js`, [], { env: { SHARD_ID: this.client.shardID } }));
		this.worker.once("ready", d => {
			winston.info(`Worker for shard ${Number(d.shard)} is up and running!`);
		});
		return this.worker;
	}
}

module.exports = WorkerManager;
