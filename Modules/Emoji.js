/**
 * Credit to TTtie for prts of the code.
 * When I came up with this idea, he was the one to help me out
 * to make this a thing!
 */

const DJSUtil = require("discord.js/src/util/Util");
const { get } = require("https");

const EmojiText = /:.*?:/;
const EmojiSkinToneText = /:(.*?)::skin-tone-([1-5]):/;
const EmojiTextSkinTone = /:(.*?):(🏻|🏼|🏽|🏾|🏿)/;
// eslint-disable-next-line max-len
const EmojiSkinToneMobile = new RegExp("(\u{261D}|\u{26F9}|\u{270A}|\u{270B}|\u{270C}|\u{270D}|\u{1F385}|\u{1F3C3}|\u{1F3C4}|\u{1F3CA}|\u{1F3CB}|\u{1F442}|\u{1F443}|\u{1F446}|\u{1F447}|\u{1F448}|\u{1F449}|\u{1F44A}|\u{1F44B}|\u{1F44C}|\u{1F44D}|\u{1F44E}|\u{1F44F}|\u{1F450}|\u{1F466}|\u{1F467}|\u{1F468}|\u{1F469}|\u{1F46E}|\u{1F470}|\u{1F471}|\u{1F472}|\u{1F473}|\u{1F474}|\u{1F475}|\u{1F476}|\u{1F477}|\u{1F478}|\u{1F47C}|\u{1F481}|\u{1F482}|\u{1F483}|\u{1F485}|\u{1F486}|\u{1F487}|\u{1F4AA}|\u{1F575}|\u{1F57A}|\u{1F590}|\u{1F595}|\u{1F596}|\u{1F645}|\u{1F646}|\u{1F647}|\u{1F64B}|\u{1F64C}|\u{1F64D}|\u{1F64E}|\u{1F64F}|\u{1F6A3}|\u{1F6B4}|\u{1F6B5}|\u{1F6B6}|\u{1F6C0}|\u{1F918}|\u{1F919}|\u{1F91A}|\u{1F91B}|\u{1F91C}|\u{1F91D}|\u{1F91E}|\u{1F926}|\u{1F930}|\u{1F933}|\u{1F934}|\u{1F935}|\u{1F936}|\u{1F937}|\u{1F938}|\u{1F939}|\u{1F93C}|\u{1F93D}|\u{1F93E}):skin-tone-([1-5]):");

module.exports = async params => {
	let split = params.split(" ").map(s => s.trim()).filter(s => s !== "");
	if (split.length > 6) split = split.slice(0, 6);

	const getEmote = async emote => {
		if (emote) {
			let discordEmote = DJSUtil.parseEmoji(emote);
			let otherEmoji = /\d{17,19}/.test(emote);
			if (!discordEmote.animated && discordEmote.id) {
				return { type: `discordCustomEmoji`, url: `https://cdn.discordapp.com/emojis/${discordEmote.id}.png` };
			} else if (discordEmote.animated) {
				return null;
			} else if (otherEmoji) {
				return { type: `discordCustomEmoji`, url: `https://cdn.discordapp.com/emojis/${emote}.png` };
			} else {
				const unicodeEmoji = (uS, sep) => {
					if (!uS) return null;
					const ret = [];
					let c = 0, p = 0, i = 0;
					while (i < uS.length) {
						c = uS.charCodeAt(i++);
						if (p) {
							ret.push((0x10000 + ((p - 0xD800) << 10) + (c - 0xDC00)).toString(16));
							p = 0;
						} else if (c >= 0xD800 && c <= 0xDBFF) {
							p = c;
						} else {
							ret.push(c.toString(16));
						}
					}
					return ret.join(sep || "-");
				};

				let match = emote.match(EmojiText);
				if (match && match.length > 0) {
					get("https://cdn.rawgit.com/omnidan/node-emoji/master/lib/emoji.json", r => {
						const buffers = [];
						r.on("data", d => buffers.push(d));
						r.once("end", () => {
							let b = Buffer.concat(buffers);
							let skinTone = emote.match(EmojiSkinToneText);
							let emoteSkin = emote.match(EmojiTextSkinTone);
							let emoteMobileSkin = emote.match(EmojiSkinToneMobile);
							let parsed;
							try {
								parsed = JSON.parse(b.toString());
							} catch (_) {
								return;
							}
							const stripOut = () => {
								if (skinTone && skinTone.length > 0) {
									let e = skinTone[1];
									let skt = parseInt(skinTone[2]) + 1;
									if (!parsed[e] || parsed[`skin-tone-${skt}`]) return "";
									return `${parsed[e]}${parsed[`skin-tone-${skt}`]}`;
								} else if (emoteMobileSkin && emoteMobileSkin.length > 0) {
									let skt = parseInt(emoteMobileSkin[2]) + 1;
									return `${emoteMobileSkin[1]}${parsed[`skin-tone-${skt}`]}`;
								} else if (emoteSkin && emoteSkin.length > 0) {
									if (!parsed[emoteSkin[1]]) return "";
									else return `${parsed[emoteSkin[1]][emoteSkin[2]]}`;
								} else {
									if (!parsed[emote.replace(/:/g, "")]) return "";
									return parsed[emote.replace(/:/g, "")];
								}
							};

							let exec = stripOut();
							return { type: "unicodeEmote", url: `https://twemoji.maxcdn.com/2/72x72/${unicodeEmoji(exec)}.png` };
						});
					});
				} else {
					return { type: "unicodeEmote", url: `https://twemoji.maxcdn.com/2/72x72/${unicodeEmoji(emote)}.png` };
				}
			}
		}
	};

	let result = (await Promise.all(split.map(getEmote))).filter(r => r && r.type && r.url);
	const Jimp = require("jimp");
	const { read, AUTO, MIME_PNG } = Jimp;
	let images = await Promise.all(result.map(r => read(r.url)));
	let total = 0;
	for (let i = 0; i < images.length; i++) {
		let image = images[i];
		image.resize(result[i].type === "unicodeEmote" ? 72 : 128, AUTO);
	}
	let height = images.slice().sort((a, b) => b.bitmap.height - a.bitmap.height)[0].bitmap.height;
	for (let i = 0; i < images.length; i++) {
		if (i === 0) total += images[i].bitmap.width;
		else total += images[i].bitmap.width + 8;
	}
	let bigImage = await new Promise((resolve, reject) => new Jimp(total, height, (err, img) => {
		if (err) reject(err);
		else resolve(img);
	}));

	let pos = 0;

	const getPixel = i => {
		let aPos = pos;
		pos = pos + images[i].bitmap.width + 8;
		return aPos;
	};
	for (let i = 0; i < images.length; i++) {
		let item = images[i];
		bigImage.composite(item, getPixel(i), 0);
	}
	// eslint-disable-next-line no-return-await
	return await new Promise((resolve, reject) => bigImage.getBuffer(MIME_PNG, (e, img) => {
		if (e) reject(e);
		else resolve(img);
	}));
};
