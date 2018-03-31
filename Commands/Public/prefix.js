module.exports = async ({ Constants: { Colors } }, { serverDocument }, msg, commandData) => {
	if (msg.suffix) {
		if (msg.suffix.length > 12) {
			return msg.send({
				embed: {
					color: Colors.INVALID,
					description: `That prefix is too long, dont't ya think? 🐳`,
				},
			});
		}
		serverDocument.config.command_prefix = msg.suffix;
		return msg.send({
			embed: {
				color: Colors.SUCCESS,
				title: `Got it! 🐬`,
				description: `The new prefix for this server is \`${msg.suffix}\``,
			},
		});
	}
	return msg.send({
		embed: {
			color: Colors.INFO,
			description: `The command prefix in this server is \`${msg.guild.commandPrefix}\``,
		},
	});
};
