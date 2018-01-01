module.exports = async ({ cli }, cmdData, args) => {
	args = args.trim();
	if (args.length === 0) return winston.error("No input for BigMessage");
	for (const shard of cli.sharder.shards.values()) {
        shard.IPC.send("sendMessage", { guild: "*", message: args });
	}
};
