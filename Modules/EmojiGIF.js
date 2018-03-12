const { get } = require("snekfetch");
const { GifCodec, BitmapImage, GifFrame } = require("gifwrap");
const Jimp = require("jimp");
const { AUTO } = Jimp;
const DJSUtil = require("discord.js/src/util/Util");

const codec = new GifCodec();

module.exports = async emojis => {
	let split = emojis.map(s => s.trim()).filter(s => s !== "");
	if (split.length > 3) split = split.slice(0, 3);

	const getEmoji = async emoji => {
		let	emoji2 = DJSUtil.parseEmoji(emoji);
		if (emoji2 && emoji2.animated) {
			const { body } = await get(`https://cdn.discordapp.com/emojis/${emoji2.id}.gif`);
			return body;
		} else if (/^\d{17,19}$/.test(emoji)) {
			const { body } = await get(`https://cdn.discordapp.com/emojis/${emoji}.gif`);
			return body;
		} else {
			return null;
		}
	};

	const results = (await Promise.all(split.map(getEmoji))).filter(Buffer.isBuffer);

	const decodedGifs = await Promise.all(results.map(frame => codec.decodeGif(frame)));
	const finishedGifs = [];

	for (let decodedGif of decodedGifs) {
		const frames = decodedGif.frames;

		frames.map(frame => new Promise((resolve, reject) => {
			// eslint-disable-next-line
			const img = new Jimp(frame.bitmap.width, frame.bitmap.height, (error, image) => {
				if (error) return reject(error);
				let bImage = new BitmapImage(frame);
				image.bitmap = bImage.bitmap;
				image.resize(128, AUTO);
				resolve(new GifFrame(bImage));
			});
		}));

		const buffer = await codec.encodeGif((await Promise.all(frames)).map(frame => {
			frame.interlaced = false;
			return frame;
		}));
		finishedGifs.push(buffer.buffer);
		// TODO: If we'll do more than 1 gif per frame, remove this
		break;
	}

	/**
	 * After resize, we want to take all gifs, and make a new frame with all the other frames combined into one
	 * So you'd have one gif frame with `n` different gifs on it
	 * The end idea is to give people a jumbo gif with all `n` animated emojis, which will be weird for emojis with less or more gif frames
	 * Maybe limit it to only one animated gif?
	 */
	return finishedGifs[0];
};
