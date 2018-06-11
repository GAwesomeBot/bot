const { RandomAnimals } = require("../../Modules/");

module.exports = async ({ Constants: { Colors } }, documents, msg, commandData) => {
	await msg.send({
		embed: {
			color: Colors.INFO,
			title: `We're getting you a cute cat picture 😺`,
			description: `Please stand by...`,
		},
	});
	try {
		const cat = await RandomAnimals.cat();
		if (cat) {
			msg.send({
				embed: {
					color: Colors.LIGHT_GREEN,
					title: `Here's your adorale cat picture! Meow! 🐱`,
					image: {
						url: cat,
					},
				},
			});
		}
	} catch (err) {
		return msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				title: `Meow... 😿`,
				description: `I failed to fetch a cat picture...`,
				footer: {
					text: `Pwease try again...`,
				},
			},
		});
	}
};
