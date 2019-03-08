const ModLog = require("../../Modules/ModLog");
const ArgParser = require("../../Modules/MessageUtils/Parser");

module.exports = async ({ Constants: { Text, Colors }, client }, { serverDocument }, msg, commandData) => {
	if (!msg.suffix) {
		return msg.send({
			embed: {
				color: Colors.BLUE,
				description: `Modlog is currently ${serverDocument.modlog.isEnabled ? `enabled in <#${serverDocument.modlog.channel_id}>. ⚒` : "disabled. 😺"}`,
				footer: {
					text: "The commands that work with my wonderful ModLog feature are: `ban`, `kick`, `mute`, `reason`, `softban`, `unban`, `unmute` and `warn`",
				},
			},
		});
	}
	const [command, id] = ArgParser.parseQuoteArgs(msg.suffix, msg.suffix.includes("|") ? "|" : " ");
	switch (command) {
		case "delete":
		case "remove": {
			if (!id) {
				return msg.sendInvalidUsage(commandData, "You need to supply a ModLog Entry to delete! 🥀");
			}
			const errorOrID = await ModLog.delete(msg.guild, id);
			if (isNaN(errorOrID) && errorOrID !== null) {
				switch (errorOrID.code) {
					case "INVALID_MODLOG_CHANNEL":
					case "MISSING_MODLOG_CHANNEL":
					case "MODLOG_ENTRY_NOT_FOUND":
						msg.send({
							embed: {
								color: Colors.SOFT_ERR,
								description: errorOrID.message,
							},
						});
						break;
					default:
						throw errorOrID;
				}
			} else if (errorOrID !== null) {
				msg.send({
					embed: {
						color: Colors.SUCCESS,
						description: `Done! Case #${errorOrID} is gone 💨`,
					},
				});
			} else {
				msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `Oh no! Something went wrong 🥀`,
					},
				});
			}
			break;
		}
		case "disable": {
			if (!serverDocument.modlog.isEnabled) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `Moderation Logging is already disabled. ✋`,
					},
				});
			}
			const ID = await ModLog.disable(msg.guild);
			if (ID === null) {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `Oh no! Something went wrong 🥀`,
					},
				});
			}
			msg.send({
				embed: {
					color: Colors.SUCCESS,
					description: `Moderation Logging has now been disabled. ❎`,
				},
			});
			break;
		}
		case "enable": {
			if (id) {
				const channel = await client.channelSearch(id, msg.guild);
				if (!channel) {
					return msg.send({
						embed: {
							color: Colors.SOFT_ERR,
							description: `Unable to find channel \`${id}\` 🚫`,
						},
					});
				}
				const errorOrID = await ModLog.enable(msg.guild, channel);
				if (isNaN(errorOrID) && errorOrID !== null) {
					switch (errorOrID.code) {
						case "INVALID_MODLOG_CHANNEL":
						case "MISSING_MODLOG_CHANNEL":
						case "MODLOG_ENTRY_NOT_FOUND":
							msg.send({
								embed: {
									color: Colors.SOFT_ERR,
									description: errorOrID.message,
								},
							});
							break;
						default:
							throw errorOrID;
					}
				} else if (errorOrID !== null) {
					msg.send({
						embed: {
							color: Colors.SUCCESS,
							description: `Moderation Logging has been enabled in <#${channel.id}> 🙌`,
						},
					});
				} else {
					msg.send({
						embed: {
							color: Colors.SOFT_ERR,
							description: `Oh no! Something went wrong 🥀`,
						},
					});
				}
			} else {
				msg.sendInvalidUsage(commandData, "A channel is required to enable Moderation Logging. 👐");
			}
			break;
		}
		default:
			msg.sendInvalidUsage(commandData);
	}
};
