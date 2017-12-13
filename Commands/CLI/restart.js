const { spawn } = require("child_process");
module.exports = async ({ cli }) => {
	winston.info("Be right back!");
	cli.dispose();
	const proc = spawn("node", ["bot"], {
		detached: true,
		shell: true,
	});
	proc.unref();
	await cli.sharder.broadcast("eval", "bot.destroy()");
	process.exit(0);
};
