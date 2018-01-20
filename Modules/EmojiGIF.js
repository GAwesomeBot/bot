const { get } = require("snekfetch");
const { GifCodec, GifUtil } = require("gifwrap");
const Jimp = require("jimp");
const { AUTO } = Jimp;
const DJSUtil = require("discord.js/src/util/Util");
const uuid = require("uuid/v4");

const codec = new GifCodec();

module.exports = async emojis => {
	let split = emojis.map(s => s.trim()).filter(s => s !== "");
	if (split.length > 3) split = split.slice(0, 3);

	const getEmoji = async emoji => {
		let	emoji2 = DJSUtil.parseEmoji(emoji);
		if (emoji2 && emoji2.animated) {
			const { body } = await get(`https://cdn.discordapp.com/emojis/${emoji2}.gif`);
			return body;
		} else if (/^\d{17,19}$/.test(emoji)) {
			const { body } = await get(`https://cdn.discordapp.com/emojis/${emoji}.gif`);
			return body;
		} else {
			return null;
		}
	};

	const results = (await Promise.all(split.map(getEmoji))).filter(a => Buffer.isBuffer(a));

	const decodedGifs = await Promise.all(results.map(r => codec.decodeGif(r)));
	const finishedGifs = [];

	for (let decodedGif of decodedGifs) {
		const frames = decodedGif.frames;

		frames.forEach(frame => {
			const jimp = new Jimp(1, 1);
			jimp.bitmap = frame.bitmap;
			jimp.resize(128, AUTO);
			frame.bitmap = jimp.bitmap;
		});

		GifUtil.quantizeDekker(frames);

		const fileUUID = uuid();

		await GifUtil.write(`./Temp/${fileUUID}.gif`, frames, decodedGif);
		finishedGifs.push(fileUUID);
	}

	/**
	 * After resize, we want to take all gifs, and make a new frame with all the other frames combined into one
	 * So you'd have one gif frame with `n` different gifs on it
	 * That will suck, so for now you don't get anything.
	 * The end idea is to give people a jumbo gif with all `n` animated emojis, which will be weird for emojis with less or more gif states
	 * Maybe limit it to only one animated gif?
	 */
	return {
		buffer: await require("fs-nextra").readFile(`./Temp/${finishedGifs[0]}.gif`),
		delete: () => require("fs-nextra").remove(`./Temp/${finishedGifs[0]}.gif`),
	};
};
