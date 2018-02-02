const { MessageAttachment } = require("discord.js");
const Emoji = require("../../Modules/Emoji");
const EmojiGIF = require("../../Modules/EmojiGIF");
const DJSUtil = require("discord.js/src/util/Util");
const { get } = require("snekfetch");

const checkEmoji = async e => {
	try {
		const res = await get(`https://cdn.discordapp.com/emojis/${e}.gif`);
		return res.status === 200;
	} catch (_) {
		return false;
	}
};

module.exports = async ({ Constants: { Colors, Text } }, documents, msg, commandData) => {
	if (msg.suffix) {
		let m = await msg.channel.send({
			embed: {
				color: Colors.INFO,
				description: `We're processing your input...`,
				footer: {
					text: `Please ${Math.floor(Math.random() * 4) > 6 ? "a" : ""}wait`,
				},
			},
		});
		const animated = msg.suffix.trim().split(/\s+/).trimAll();
		let every = true;
		for (const param of animated) {
			const parsed = DJSUtil.parseEmoji(param);
			if (parsed && parsed.animated && parsed.id) {
				const res = await checkEmoji(parsed.id);
				if (!res) {
					every = false;
					break;
				}
			} else if (/\d{17,19}/.test(param)) {
				const res = await checkEmoji(param);
				if (!res) {
					every = false;
					break;
				}
			} else {
				every = false;
				break;
			}
		}
		if (every) {
			try {
				const b = await EmojiGIF(animated);
				if (b) {
					await m.delete();
					try {
						await msg.channel.send({
							embed: {
								files: [new MessageAttachment(b, "jumbo.gif")],
								image: {
									url: `attachment://jumbo.gif`,
								},
								color: Colors.SUCCESS,
							},
						});
					} catch (_) {
						// TODO: Figure out a way to send the image, either via imgur or other means
					}
				} else {
					m.edit({
						embed: {
							color: Colors.ERR,
							description: `We couldn't create a gif based on your input...`,
							footer: {
								text: `Please verify it and try again! Make sure to have a space between each emoji!`,
							},
						},
					});
				}
			} catch (_) {
				m.edit({
					embed: {
						color: Colors.ERR,
						description: `We couldn't create a gif based on your input...`,
						footer: {
							text: `Please verify it and try again! Make sure to have a space between each emoji!`,
						},
					},
				});
			}
		} else {
			try {
				const b = await Emoji(msg.suffix);
				if (b) {
					await m.delete();
					try {
						await msg.channel.send({
							embed: {
								files: [new MessageAttachment(b, "jumbo.png")],
								image: {
									url: `attachment://jumbo.png`,
								},
								color: Colors.SUCCESS,
							},
						});
					} catch (_) {
						// TODO: Figure out a way to send the image, either via imgur or other means
					}
				} else {
					m.edit({
						embed: {
							color: Colors.ERR,
							description: `We couldn't create an image based on your input...`,
							footer: {
								text: `Please verify it and try again! Make sure to have a space between each emoji!`,
							},
						},
					});
				}
			} catch (_) {
				m.edit({
					embed: {
						color: Colors.ERR,
						description: `We couldn't create an image based on your input...`,
						footer: {
							text: `Please verify it and try again! Make sure to have a space between each emoji!`,
						},
					},
				});
			}
		}
	} else {
		winston.verbose(`Emoji(s) not provided for "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.send({
			embed: {
				color: Colors.INVALID,
				description: Text.INVALID_USAGE(commandData, msg.guild.commandPrefix),
				title: `What would you like to jumbo today? 🤔`,
			},
		});
	}
};
