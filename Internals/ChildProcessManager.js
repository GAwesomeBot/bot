const { Error } = require("./Errors/");
const { ChildProcessTypes } = require("./Constants");
const processAsPromised = require("process-as-promised");
const { fork } = require("child_process");

class ChildProcessManager {
	constructor (client) {
		this.client = client;

		// Fork of the child process responsible for running extensions
		this.extensionRunner = null;
	}

	async getValueFromWorker (workerType, { requestedInfo, command = null } = {}) {
		switch (workerType) {
			case ChildProcessTypes.MATH: {
				return this._getMathJSResult(command, requestedInfo);
			}
			default: {
				throw new Error("CHILD_PROCESS_TYPE_INVALID", workerType);
			}
		}
	}

	async _getMathJSResult (command, requestedInfo) {
		if (!command) throw new Error("CHILD_PROCESS_MISSING_PROPERTY", "command");
		if (!requestedInfo) throw new Error("CHILD_PROCESS_MISSING_PROPERTY", "The information");
		const tempChild = new processAsPromised(fork(`${__dirname}/ChildProcesses/MathJS.js`));
		const res = await tempChild.send("runCommand", { command, info: requestedInfo });
		if (res.error) throw res.error;
		else return res.result;
	}
}

module.exports = ChildProcessManager;
