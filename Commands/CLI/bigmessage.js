module.exports = async ({ cli }, cmdData, args) => {
	args = args.trim();
	if (args.length === 0) return winston.warn("No input for BigMessage");
	cli.sharder.broadcast("sendMessage", { guild: "*", message: args });
};
