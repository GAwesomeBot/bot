const { tokens } = require("../../Configurations/auth");
const fetch = require("chainfetch");

module.exports = async ({ Constants: { Colors, APIs, UserAgent, Text }, auth }, documents, msg, commandData) => {
	if (!tokens.bitlyToken || tokens.bitlyToken === "") {
		await msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: "The shorten command is not available on this bot. 🌧️",
			},
		});
		return;
	}

	if (!msg.suffix) {
		return msg.sendInvalidUsage(commandData);
	}

	let link = msg.suffix.trim();
	if (link.toLowerCase().startsWith("https://bit.ly") || link.toLowerCase().startsWith("http://bit.ly") || link.toLowerCase().startsWith("bit.ly")) {
		try {
			link = link.substring(link.indexOf("bit.ly"));
			const body = await fetch.post(APIs.BITLY("expand")).set({
				"User-Agent": UserAgent,
				"Content-Type": "application/json",
				Authorization: `Bearer ${tokens.bitlyToken}`,
			}).send({ bitlink_id: link })
				.onlyBody();

			if (body.long_url && body.long_url !== "") {
				msg.send({
					embed: {
						color: Colors.RESPONSE,
						description: `That bitly link links to ${body.long_url}`,
					},
				});
			} else {
				msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `The bitly link ${link} hasn't been registered yet.`,
					},
				});
			}
		} catch (err) {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `The bitly link ${link} hasn't been registered yet.`,
				},
			});
		}
	} else {
		try {
			const body = await fetch.post(APIs.BITLY("shorten")).set({
				"User-Agent": UserAgent,
				"Content-Type": "application/json",
				Authorization: `Bearer ${tokens.bitlyToken}`,
			}).send({ long_url: msg.suffix })
				.onlyBody();

			if (body.link && body.link !== "") {
				msg.send({
					embed: {
						color: Colors.RESPONSE,
						description: `Done! Here's your bitly link: ${body.link}`,
					},
				});
			} else {
				msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: "Something went wrong while trying to shorten your link!",
						footer: {
							text: "Make sure it's formatted correctly.",
						},
					},
				});
			}
		} catch (err) {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: "Something went wrong while trying to shorten your link!",
					footer: {
						text: "Make sure it's formatted correctly.",
					},
				},
			});
		}
	}
};
