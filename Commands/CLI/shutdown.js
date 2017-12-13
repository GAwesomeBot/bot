module.exports = async ({ cli }) => {
	winston.info("See you soon!");
	cli.dispose();
	await cli.sharder.broadcast("eval", "bot.destroy()");
	process.exit(0);
};
