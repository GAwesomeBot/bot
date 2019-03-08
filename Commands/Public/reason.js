const ModLog = require("../../Modules/ModLog");

module.exports = async ({ Constants: { Colors, Text } }, { serverDocument }, msg, commandData) => {
	const args = msg.suffix ? msg.suffix.split(" ") : [];
	if (args.length >= 2) {
		const result = await ModLog.update(msg.guild, args[0].trim(), {
			reason: msg.suffix.substring(msg.suffix.indexOf(" ") + 1).trim(),
		});
		if (isNaN(result)) {
			switch (result.code) {
				case "INVALID_MODLOG_CHANNEL":
				case "MISSING_MODLOG_CHANNEL":
				case "MODLOG_ENTRY_NOT_FOUND":
					msg.send({
						embed: {
							color: Colors.SOFT_ERR,
							description: result.message,
						},
					});
					break;
				default:
					throw result;
			}
		} else {
			msg.send({
				embed: {
					color: Colors.SUCCESS,
					description: "Reason updated ✅",
				},
			});
		}
	} else {
		msg.send({
			embed: {
				color: Colors.INVALID,
				description: Text.INVALID_USAGE(commandData, msg.guild.commandPrefix),
			},
		});
	}
};
