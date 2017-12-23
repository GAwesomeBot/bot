module.exports = async ({ cli }) => {
	winston.info("See you soon!");
	cli.sharder.IPC.onEvents.get("shutdown")({ err: false, soft: false });
};
