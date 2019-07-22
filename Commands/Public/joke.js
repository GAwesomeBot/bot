const fetch = require("chainfetch");

module.exports = async ({ Constants: { Colors, APIs, UserAgent } }, documents, msg, commandData) => {
	await msg.send({
		embed: {
			color: Colors.INFO,
			title: `Loading times are the biggest joke of all`,
			description: `We're getting you a better one...`,
		},
	});

	try {
		const body = await fetch.get(APIs.JOKE()).set({ Accept: "application/json", "User-Agent": UserAgent }).toJSON()
			.onlyBody();

		if (body.status === 200 && body.joke && typeof body.joke === "string") {
			msg.send({
				embed: {
					color: Colors.RESPONSE,
					description: body.joke.length < 2048 ? body.joke : `${body.joke.substring(0, 2045)}...`,
				},
			});
		}
	} catch (err) {
		logger.debug("Failed to fetch joke for the joke command.", { svrid: msg.guild.id }, err);
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: "Failed to fetch a joke...",
				footer: {
					text: "Failure is funny too, right?",
				},
			},
		});
	}
};
