const fetch = require("chainfetch");

module.exports = async ({ Constants: { Colors, Text, APIs, UserAgent } }, documents, msg, commandData) => {
	if (msg.suffix) {
		const comicData = await fetch.get(APIs.XKCD(msg.suffix)).set({ "User-Agent": UserAgent, Accepts: "application/json" }).onlyBody()
			.catch(() => null);
		if (!comicData) {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `Doh! An XKCD comic with ID ${msg.suffix} wasn't found.`,
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
	} else {
		const comicData = await fetch.get(APIs.XKCD()).set({ "User-Agent": UserAgent, Accepts: "application/json" }).onlyBody()
			.catch(() => null);
		if (!comicData) {
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
	}
};
