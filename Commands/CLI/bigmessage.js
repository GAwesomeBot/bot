module.exports = async ({ cli }, cmdData, args) => {
	args = args.trim();
	if (args.length === 0) return winston.warn("No input for BigMessage");
	winston.info("Sending the message to all servers...")
	cli.sharder.broadcast("sendMessage", { guild: "*", message: args });
};
