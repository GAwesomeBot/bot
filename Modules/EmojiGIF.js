const { get } = require("snekfetch");
const { GifCodec } = require("gifwrap");
const DJSUtil = require("discord.js/src/util/Util");

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
			let scaleFactor;
			switch (frame.bitmap.height) {
				case 12: {
					scaleFactor = 10;
					break;
				}
				case 13:
				case 14:
				case 15:
				case 16: {
					scaleFactor = 8;
					break;
				}
				case 32:
				case 33:
				case 34: {
					scaleFactor = 4;
					break;
				}
				case 64:
				case 65: {
					scaleFactor = 2;
					break;
				}
				case 100:
				case 112: {
					scaleFactor = 1;
					break;
				}
				default: {
					scaleFactor = 2;
				}
			}
			frame.scale(scaleFactor);
		});

		const buffer = await codec.encodeGif(frames, decodedGif);
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
