const fetch = require("chainfetch");
const { tokens: { wolframAppID } } = require("../../Configurations/auth");

module.exports = async ({ Constants: { Colors, APIs, UserAgent, Text } }, documents, msg, commandData) => {
	if (!msg.suffix) {
		return msg.sendInvalidUsage(commandData);
	}

	const response = await msg.send(Text.THIRD_PARTY_FETCH("Fetching data from Wolfram|Alpha"));

	const query = encodeURIComponent(msg.suffix);
	const body = (await fetch.get(APIs.WOLFRAM(wolframAppID, query)).set("User-Agent", UserAgent).onlyBody()).queryresult;
	if (body.success && body.pods.length) {
		const fields = body.pods.map(pod => ({
			name: pod.title,
			value: pod.subpods[0].plaintext && pod.subpods[0].plaintext !== "" ? pod.subpods[0].plaintext : `[Image](${pod.subpods[0].img.src})`,
		}));

		response.edit({
			embed: {
				color: Colors.RESPONSE,
				title: "Here's your result from Wolfram|Alpha!",
				fields,
			},
		});
	} else if (!body.error && body.numpods === 0) {
		response.edit({
			embed: {
				color: Colors.SOFT_ERR,
				description: "Wolfram|Alpha has nothing 💡",
				footer: {
					text: "Try searching for something else!",
				},
			},
		});
	} else {
		logger.debug("Error occurred at Wolfram|Alpha!", { svrid: msg.guild.id, query: query, err: body.error });
		response.edit({
			embed: {
				color: Colors.SOFT_ERR,
				description: "Unfortunately, I didn't get anything back from Wolfram|Alpha 😔",
			},
		});
	}
};
