/*
MIT License

Copyright (c) TTtie 2018

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
// Code is slightly modified from the source. See license above.

const { GifCodec, GifFrame, BitmapImage } = require("gifwrap");
const Jimp = require("jimp");
const { AUTO } = Jimp;

const codec = new GifCodec();

module.exports = async (result, buffer) => {
	let frames = [];
	let gif;
	if (Buffer.isBuffer(buffer)) {
		gif = await codec.decodeGif(buffer);
		({ frames } = gif);
	} else if (buffer instanceof GifFrame) {
		frames = [buffer];
	}
	frames.map(async frame => {
		const image = new Jimp(frame.bitmap.width, frame.bitmap.height);
		const bImage = new BitmapImage(frame);
		image.bitmap = bImage.bitmap;
		image.resize(result.type === "unicode" ? 72 : 128, AUTO);
		return new GifFrame(bImage);
	});
	return {
		frames: await Promise.all(frames),
		gif,
	};
};
