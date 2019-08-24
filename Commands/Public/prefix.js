module.exports = async ({ Constants: { Colors } }, { serverQueryDocument }, msg, commandData) => {
	if (msg.suffix) {
		let { suffix } = msg;
		if (msg.suffix.startsWith(`"`) && msg.suffix.endsWith(`"`)) suffix = msg.suffix.slice(1, msg.suffix.length - 1);
		if (suffix.length > 25) {
			return msg.send({
				embed: {
					color: Colors.INVALID,
					description: `That prefix is too long, don't ya think? 🐳`,
				},
			});
		}
		serverQueryDocument.set("config.command_prefix", suffix);
		return msg.send({
			embed: {
				color: Colors.SUCCESS,
				title: `Got it! 🐬`,
				description: `The new prefix for this server is \`${suffix}\``,
			},
		});
	}
	return msg.send({
		embed: {
			color: Colors.INFO,
			title: "I'm sure you already know this...",
			description: `The command prefix in this server is \`${msg.guild.commandPrefix}\``,
		},
	});
};
