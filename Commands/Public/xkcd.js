const fetch = require("chainfetch");

module.exports = async ({ Constants: { Colors, Text, APIs, UserAgent } }, documents, msg) => {
	const comicData = await fetch.get(APIs.XKCD(msg.suffix ? msg.suffix : undefined)).set({ "User-Agent": UserAgent, Accept: "application/json" }).onlyBody()
		.catch(() => null);
	if (msg.suffix) {
		if (!comicData) {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `Doh! A XKCD comic with ID ${msg.suffix} wasn't found.`,
				},
			});
		} else {
			msg.send({
				embed: {
					color: Colors.RESPONSE,
					title: comicData.title,
					image: {
						url: comicData.img || comicData.alt,
					},
					footer: {
						text: `#${comicData.num}`,
					},
					timestamp: new Date(`${comicData.year}-${comicData.month}-${comicData.day}`),
				},
			});
		}
	} else if (!comicData) {
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: `Doh! The current XKCD comic couldn't be fetched.`,
			},
		});
	} else {
		msg.send({
			embed: {
				color: Colors.RESPONSE,
				title: comicData.title,
				image: {
					url: comicData.img || comicData.alt,
				},
				footer: {
					text: `Latest XKCD Comic | #${comicData.num}`,
				},
				timestamp: new Date(`${comicData.year}-${comicData.month}-${comicData.day}`),
			},
		});
	}
};
