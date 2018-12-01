const { Stopwatch } = require("../../Modules/Utils/");

module.exports = async ({ client, Constants: { Colors } }, documents, msg, commandData) => {
	const timer = new Stopwatch();
	await msg.send({
		embed: {
			color: Colors.INFO,
			title: "Getting the ping 🏓",
			description: "Please stand by...",
		},
	});
	const sendPing = timer.duration;
	timer.stop();
	msg.send({
		embed: {
			color: Colors.LIGHT_GREEN,
			title: "Pong! 🏓",
			description: `Sending this message took **${Math.round(sendPing / 2)}**ms. The average heartbeat ping is **${Math.floor(client.ws.ping)}**ms`,
			footer: {
				text: `This server is on shard ${client.shardID}.`,
			},
		},
	});
};
