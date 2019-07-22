const { Error } = require("./Errors/");
const { WorkerTypes, WorkerEvents } = require("./Constants");
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
			case WorkerTypes.EMOJI: {
				return this._jumboEmoji(data);
			}
			default: {
				throw new Error("CHILD_PROCESS_TYPE_INVALID", workerType);
			}
		}
	}

	async sendValueToWorker (workerType, data) {
		switch (workerType) {
			case WorkerTypes.EXTENSION: {
				return this.safeSend(WorkerEvents.RUN_EXTENSION, data);
			}
			default: {
				throw new Error("CHILD_PROCESS_TYPE_INVALID", workerType);
			}
		}
	}

	async _getMathJSResult (command, requestedInfo) {
		if (!command) throw new Error("CHILD_PROCESS_MISSING_PROPERTY", "command");
		if (!requestedInfo) throw new Error("CHILD_PROCESS_MISSING_PROPERTY", "The information");
		const res = await this.safeSend(WorkerEvents.RUN_MATH, { command, info: requestedInfo });
		if (res.error) throw res.error;
		else return res.result;
	}

	async _jumboEmoji (input) {
		const { buffer, animated } = await this.safeSend(WorkerEvents.JUMBO_EMOJI, { input });
		return {
			buffer: Buffer.from(buffer, "base64"),
			animated,
		};
	}

	async startWorker () {
		this.worker = new processAsPromised(fork(`${__dirname}/Worker.js`, [], { env: { SHARDS: this.client.shardID, SHARD_COUNT: process.env.SHARD_COUNT }, execArgv: [] }));
		this.worker.once("ready", async d => {
			logger.info(`Worker for shard ${Number(d.shard)} is up and running!`);
		});
		this.worker.on("exit", () => {
			logger.warn("Worker exited.");
		});
		return this.worker;
	}

	async safeSend (command, d) {
		if (this.worker.process.connected) {
			try {
				const res = await this.worker.send(command, d);
				return res;
			} catch (e) {
				if (e.code === "ERR_IPC_CHANNEL_CLOSED") {
					await this.startWorker();
					return this.safeSend(command, d);
				}
			}
		} else {
			await this.startWorker();
			return this.safeSend(command, d);
		}
	}
}

module.exports = WorkerManager;
