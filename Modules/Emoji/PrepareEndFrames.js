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

const { BitmapImage, GifFrame } = require("gifwrap");
const Jimp = require("jimp");

const EmojiUtil = require("./EmojiUtil");

module.exports = async (totalWidth, totalHeight, images, frames) => {
	const finishedFrames = [];
	images.forEach(frame => {
		EmojiUtil.fillArray(frame, Math.floor(frames / frame.length) + 1);
	});

	for (let i = 0; i < frames; i++) {
		let pos = 0;
		const getPixel = index => {
			const aPos = pos;
			pos += images[index][0].bitmap.width + 8;
			return aPos;
		};
		const largeFrame = new Jimp(totalWidth, totalHeight);
		const imageMap = images.map(frame => {
			if (frame[i]) return frame[i];
			return frame[0];
		});
		imageMap.forEach((frame, index) => {
			const tempImage = new Jimp(0, 0);
			tempImage.bitmap = new BitmapImage(frame.bitmap).bitmap;
			largeFrame.composite(tempImage, getPixel(index), 0);
		});
		finishedFrames.push(new GifFrame(new BitmapImage(largeFrame.bitmap), {
			delayCentisecs: 2,
		}));
	}
	return finishedFrames;
};
