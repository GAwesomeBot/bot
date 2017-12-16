module.exports = async ({ cli }) => {
	winston.info("See you soon!");
	cli.dispose();
	cli.sharder.IPC.send("shutdown", {});
	process.exit(0);
};
