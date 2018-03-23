module.exports = async ({ cli }, cmdData, args) => {
	if (!args) return winston.warn("Missing arguments for seval");
	let [shard, ...code] = args.split(" ");
	if (isNaN(parseInt(shard))) {
		code.unshift(shard);
		shard = 0;
	} else {
		shard = parseInt(shard);
	}
	if (!code.length) return winston.warn("Missing code.");
	let s;
	if (!cli.sharder.shards.has(shard)) {
		winston.warn("Invalid shard; sending to shard 0");
		s = cli.sharder.shards.get(0);
		shard = 0;
	} else {
		s = cli.sharder.shards.get(shard);
	}
	const res = await s.send("evaluate", code.join(" "));
	winston[res.err ? "error" : "info"](`Evaluated on shard ${shard} with this output:\n${res.result}`);
};
