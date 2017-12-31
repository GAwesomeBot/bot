const { RandomAnimals } = require("../../Modules/");

module.exports = async ({ Constants: { Colors } }, documents, msg, commandData) => {
	let cat;
	try {
		cat = await RandomAnimals.cat();
	} catch (err) {
		return msg.channel.send({
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
	if (cat) {
		msg.channel.send({
			embed: {
				color: Colors.LIGHT_GREEN,
				title: `Here's your adorale cat picture! Meow! 🐱`,
				image: {
					url: cat,
				},
			},
		});
	}
};
