const { get } = require("snekfetch");
const leven = require("fast-levenshtein");

module.exports = async ({ Constants: { Colors, APIs, FortuneCategories, Text } }, documents, msg, commandData) => {
	let ENDPOINT = APIs.FORTUNE();
	if (msg.suffix) {
		let choice = null;
		if (FortuneCategories.includes(msg.suffix.toLowerCase().trim())) {
			choice = msg.suffix.toLowerCase().trim();
		} else {
			choice = FortuneCategories.find(category => leven.get(category, msg.suffix.toLowerCase().trim()) < 3);
		}
		if (choice) {
			ENDPOINT = APIs.FORTUNE(choice);
		} else {
			return msg.send({
				embed: {
					color: Colors.INVALID,
					title: `That doesn't seem like a valid category...`,
					description: `Here are the valid categories:\n\n${FortuneCategories.map(cat => `» **${cat}**\n`).join("")}`,
				},
			});
		}
	}
	await msg.send({
		embed: {
			color: Colors.INFO,
			description: `We're preparing your fortune cookie`,
			footer: {
				text: `Please stand by...`,
			},
		},
	});
	try {
		const res = await get(ENDPOINT).set("Accept", "application/json");
		msg.send({
			embed: {
				color: Colors.SUCCESS,
				title: `Here is your fortune:`,
				description: `${res.body.fortune}`,
			},
		});
	} catch (err) {
		return msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				title: Text.ERROR_TITLE(),
				description: `I received this error:\`\`\`js\n${err.body}\`\`\``,
			},
		});
	}
};
