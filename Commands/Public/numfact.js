const fetch = require("chainfetch");

module.exports = async ({ Constants: { Colors, APIs, UserAgent, Text } }, documents, msg, commandData) => {
	const number = msg.suffix || "random";
	if (msg.suffix && isNaN(msg.suffix)) {
		return msg.sendInvalidUsage(commandData, "That isn't a valid number!");
	}

	await msg.send(Text.THIRD_PARTY_FETCH(`We're fetching your ${number} fact`));

	try {
		const body = await fetch.get(APIs.NUMFACT(number)).set("User-Agent", UserAgent).onlyBody();

		if (body && typeof body === "string") {
			msg.send({
				embed: {
					color: Colors.RESPONSE,
					description: body.length < 2048 ? body : `${body.substring(0, 2045)}...`,
				},
			});
		}
	} catch (err) {
		logger.debug("Failed to fetch number fact for the numfact command.", { svrid: msg.guild.id }, err);
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: "Failed to fetch a number fact...",
				footer: {
					text: "In hindsight, dividing by zero was a mistake.",
				},
			},
		});
	}
};
