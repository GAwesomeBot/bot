const { RandomAnimals } = require("../../Modules/");

module.exports = async ({ Constants: { Colors } }, documents, msg, commandData) => {
	await msg.send({
		embed: {
			color: Colors.INFO,
			title: `We're getting you a cute fox picture 🦊`,
			description: `Please stand by...`,
		},
	});
	try {
		const dog = await RandomAnimals.fox();
		if (fox) {
			msg.send({
				embed: {
					color: Colors.LIGHT_GREEN,
					title: `Here's your adorale fox picture! 🦊`,
					image: {
						url: "https://foxapi.dev/foxes",
					},
				},
			});
		}
	} catch (err) {
		return msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: `I failed to fetch a fox picture...`,
				footer: {
					text: `Pwease try again...`,
				},
			},
		});
	}
};
