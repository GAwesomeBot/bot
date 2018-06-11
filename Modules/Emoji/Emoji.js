const prepareFrames = require("./PrepareFrames");
const prepareEndFrames = require("./PrepareEndFrames");
const EmojiUtils = require("./EmojiUtil");

const Jimp = require("jimp");
const { read, MIME_PNG, AUTO } = Jimp;
const { GifCodec, GifFrame, BitmapImage, GifUtil } = require("gifwrap");
const { get } = require("snekfetch");

const codec = new GifCodec();

module.exports = async emojis => {
	emojis = emojis.map(e => e.trim()).filter(Boolean);
	if (emojis.length > 6) emojis = emojis.splice(0, 6);
	const results = await Promise.all(emojis.map(e => EmojiUtils.getEmojiMetadata(e)));
	// #region SingleParamGiven
	if (results.length === 1) {
		if (results[0].type === "unicode") {
			return {
				buffer: (await get(results[0].url)).body,
			};
		}
		if (results[0].url.endsWith(".gif")) {
			const decodedGif = await codec.decodeGif((await get(results[0].url)).body);
			const { frames } = decodedGif;
			frames.map(async frame => {
				const image = new Jimp(frame.bitmap.width, frame.bitmap.height);
				const bImage = new BitmapImage(frame);
				image.bitmap = bImage.bitmap;
				image.resize(128, AUTO);
				return new GifFrame(bImage);
			});
			const { buffer } = await codec.encodeGif((await Promise.all(frames)).map(frame => {
				frame.interlaced = false;
				return frame;
			}));
			return {
				buffer,
				animated: true,
			};
		} else {
			const image = await read(results[0].url);
			image.resize(128, AUTO);
			const buffer = await new Promise((resolve, reject) => image.getBuffer(MIME_PNG, (error, img) => {
				if (error) reject(error);
				else resolve(img);
			}));
			return {
				buffer,
			};
		}
	}
	// #endregion SingleParamGiven
	const data = await Promise.all(results.map(async result => {
		if (result.animated) {
			const { body } = await get(result.url);
			return prepareFrames(result, body);
		}
		const image = await read(result.url);
		return prepareFrames(result, new GifFrame(new BitmapImage(image.bitmap)));
	}));
	const rawFrames = data.map(img => img.frames);

	let totalWidth = 0;
	const totalHeight = rawFrames.slice().sort((a, b) => b[0].bitmap.height - a[0].bitmap.height)[0][0].bitmap.height;
	const totalFrames = rawFrames.slice().sort((a, b) => b.length - a.length)[0].length;
	rawFrames.forEach(frames => {
		frames.forEach(frame => {
			frame.interlaced = false;
		});
	});

	for (let i = 0; i < rawFrames.length; i++) {
		if (i === 0) totalWidth += rawFrames[i][0].bitmap.width;
		else totalWidth += rawFrames[i][0].bitmap.width + 8;
	}

	const finalTotalFrames = await prepareEndFrames(totalWidth, totalHeight, rawFrames.slice(), totalFrames);
	finalTotalFrames.forEach(frame => {
		frame.interlaced = false;
	});
	GifUtil.quantizeDekker(finalTotalFrames);
	const gif = await codec.encodeGif(finalTotalFrames);
	let image = gif.buffer;
	if (gif.frames.length === 1) {
		const frame = gif.frames[0];
		const tempImage = new Jimp(0, 0);
		tempImage.bitmap = new BitmapImage(frame).bitmap;
		image = await new Promise((resolve, reject) => tempImage.getBuffer(MIME_PNG, (error, buffer) => error ? reject(error) : resolve(buffer)));
	}

	return {
		buffer: image,
		animated: gif.frames.length > 1,
	};
};
