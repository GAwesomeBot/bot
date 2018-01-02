module.exports = async ({ cli }, cmdData, args) => {
	args = args.trim();
	if (args.length === 0) return winston.error("No input for BigMessage");
	cli.sharder.broadcast("sendMessage", { guild: "*", message: args });
};
