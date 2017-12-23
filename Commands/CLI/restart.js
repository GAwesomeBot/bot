const { spawn } = require("child_process");
module.exports = async ({ cli }) => {
	cli.sharder.IPC.onEvents.get("shutdown")({ err: false, soft: true });
};
