const { Error } = require("../../Internals/Errors");
const {
	EmojiRegex: {
		MobileSkinTone,
		SkinToneText,
		Text,
		UnicodeSkinTone,
	},
} = require("../../Internals/Constants");
const DJSUtil = require("discord.js/src/util/Util");
const { get } = require("snekfetch");

module.exports = class EmojiUtil {
	constructor () {
		throw new Error("STATIC_CLASS", {}, this.constructor.name);
	}

	static async getEmojiMetadata (emoji) {
		const discordUtilEmoji = DJSUtil.parseEmoji(emoji);
		if (discordUtilEmoji && discordUtilEmoji.id && discordUtilEmoji.animated) {
			return {
				type: "custom",
				url: `https://cdn.discordapp.com/emojis/${discordUtilEmoji.id}.gif`,
				animated: true,
			};
		}
		if (discordUtilEmoji && discordUtilEmoji.id && !discordUtilEmoji.animated) {
			return {
				type: "custom",
				url: `https://cdn.discordapp.com/emojis/${discordUtilEmoji.id}.png`,
				animated: false,
			};
		}
		if (/\d{17,}/.test(emoji)) {
			let url, animated = false;
			try {
				await get(url = `https://cdn.discordapp.com/emojis/${emoji}.gif`);
				animated = true;
			} catch (_) {
				await get(url = `https://cdn.discordapp.com/emojis/${emoji}.png`).catch(() => {
					url = null;
				});
			}
			if (url) {
				return {
					type: "custom",
					url,
					animated,
				};
			}
		}
		const match = emoji.match(Text);
		if (match && match.length > 0) {
			const { body: emojis } = await get(`https://cdn.rawgit.com/omnidan/node-emoji/master/lib/emoji.json`);
			const result = EmojiUtil.stripOut(emoji, emoji.match(SkinToneText), emoji.match(UnicodeSkinTone), emoji.match(MobileSkinTone), emojis);
			return {
				type: "unicode",
				url: `https://twemoji.maxcdn.com/2/72x72/${EmojiUtil.getUnicode(result)}.png`,
				animated: false,
			};
		}
		return {
			type: "unicode",
			url: `https://twemoji.maxcdn.com/2/72x72/${EmojiUtil.getUnicode(emoji)}.png`,
			animated: false,
		};
	}

	static getUnicode (entry, separator = "-") {
		if (!entry) return "";
		const ret = [];
		let char = 0, p = 0, i = 0;
		while (i < entry.length) {
			char = entry.charCodeAt(i++);
			if (p) {
				ret.push((0x10000 + ((p - 0xD800) << 10) + (char - 0xDC00)).toString(16));
				p = 0;
			} else if (char >= 0xD800 && char <= 0xDBFF) {
				p = char;
			} else {
				ret.push(char.toString(16));
			}
		}
		return ret.join(separator);
	}

	static stripOut (providedEmoji, skinToneText, unicodeSkinTone, mobileSkinTone, body) {
		if (skinToneText && skinToneText.length) {
			const emoji = skinToneText[1];
			const skinTone = parseInt(skinToneText[2]) + 1;
			if (!body[emoji] || body[`skin-tone-${skinTone}`]) return "";
			return `${body[emoji]}${body[`skin-tone${skinTone}`]}`;
		} else if (mobileSkinTone && mobileSkinTone.length) {
			const skinTone = parseInt(mobileSkinTone[2]) + 1;
			return `${mobileSkinTone[1]}${body[`skin-tone-${skinTone}`]}`;
		} else if (unicodeSkinTone && unicodeSkinTone.length) {
			if (!body[unicodeSkinTone[1]]) return "";
			return `${body[unicodeSkinTone[1]]}${unicodeSkinTone[2]}`;
		} else if (!body[providedEmoji.replace(/:/g, "")]) {
			return "";
		}
		return body[providedEmoji.replace(/:/g, "")];
	}

	static fillArray (array, times) {
		const copy = array.slice();
		for (let i = 0; i < times; i++) copy.forEach(c => array.push(c));
	}
};
