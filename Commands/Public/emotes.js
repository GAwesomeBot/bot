const moment = require("moment-timezone");
const DJSUtils = require("discord.js/src/util/Util");

module.exports = async ({ client, Constants: { Colors } }, documents, msg, commandData) => {
	if (msg.suffix) {
		const emoji = msg.suffix.split(/\s+/)[0];
		let parsedEmoji = DJSUtils.parseEmoji(emoji);
		if (/^\d{17,19}/.test(emoji)) {
			parsedEmoji = { id: String(emoji), animated: "unknown" };
		}
		if (!parsedEmoji) {
			msg.send({
				embed: {
					color: Colors.INVALID,
					description: `Your input is not an emoji! 😒`,
				},
			});
		} else if (parsedEmoji && !parsedEmoji.id) {
			msg.send({
				embed: {
					color: Colors.INVALID,
					description: `That's a unicode emoji!`,
					footer: {
						text: `This command only works with custom emojis.`,
					},
				},
			});
		} else if (parsedEmoji && parsedEmoji.id) {
			const globalEmoji = client.emojis.get(parsedEmoji.id);
			if (globalEmoji) {
				const fields = [
					{
						name: `Emoji name and ID`,
						value: `Name: \`:${globalEmoji.name}:\`\nID: \`${globalEmoji.id}\``,
						inline: true,
					},
					{
						name: `Guild`,
						value: `Name: ${globalEmoji.guild.name}\nID: \`${globalEmoji.guild.id}\``,
						inline: true,
					},
				];

				let rawEmoji;
				try {
					rawEmoji = (await client.api.guilds(globalEmoji.guild.id).emojis.get()).find(e => e.id === globalEmoji.id);
				} catch (_) {
					rawEmoji = { user: null };
				}

				if (rawEmoji.user) {
					fields.push({
						name: `Created by`,
						value: `Name: **${rawEmoji.user.username}#${rawEmoji.user.discriminator}**\nID: \`${rawEmoji.user.id}\``,
						inline: true,
					});
				} else {
					fields.push({
						name: `Created by`,
						value: `**Unknown User#0000**`,
						inline: true,
					});
				}

				if (globalEmoji.animated) {
					fields.push({
						name: `Animated`,
						value: `Yes. 🎥`,
						inline: true,
					});
				} else {
					fields.push({
						name: `Animated`,
						value: `No. 🖼`,
						inline: true,
					});
				}

				if (globalEmoji.managed) {
					fields.push({
						name: `Managed by an integration`,
						value: `Yes. 🔐`,
						inline: true,
					});
				} else {
					fields.push({
						name: `Managed by an integration`,
						value: `No. 💡`,
						inline: true,
					});
				}

				if (globalEmoji.roles.size) {
					fields.push({
						name: `Roles`,
						value: `The following roles can use this emoji:\n» ${globalEmoji.roles.sort((a, b) => b.position - a.position).map(r => r.toString()).join("\n» ")}`,
						inline: true,
					});
				} else {
					fields.push({
						name: `Roles`,
						value: `Everyone can use this emoji! 🎉`,
						inline: true,
					});
				}

				msg.send({
					embed: {
						color: Colors.RESPONSE,
						fields,
						thumbnail: {
							url: globalEmoji.url,
						},
						footer: {
							text: `Created at`,
						},
						timestamp: globalEmoji.createdAt,
					},
				});
			} else {
				msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `I don't know too much about this emoji, but here is everything I can tell you!`,
						thumbnail: {
							url: parsedEmoji.animated !== "unknown" ? `${client.options.http.cdn}/emojis/${parsedEmoji.id}.${parsedEmoji.animated === true ? "gif" : "png"}` : "",
						},
						fields: [
							{
								name: `Emoji ID${parsedEmoji.name ? ` and name` : ""}`,
								value: `ID: \`${parsedEmoji.id}\`${parsedEmoji.name ? `\nName: \`:${parsedEmoji.name}:\`` : ""}`,
								inline: true,
							},
							{
								name: `Animated`,
								value: parsedEmoji.animated === "unknown" ? `Unknown. 🤔` : parsedEmoji.animated === true ? `Yes. 🎥` : `No. 🖼`,
								inline: true,
							},
						],
					},
				});
			}
		}
	} else if (msg.guild.emojis.size) {
		const staticEmojis = msg.guild.emojis.filter(e => !e.animated);
		const animatedEmojis = msg.guild.emojis.filter(e => e.animated);
		const fields = [];
		staticEmojis.size && fields.push({
			name: `There ${staticEmojis.size === 1 ? "is" : "are"} ${staticEmojis.size} static emoji${staticEmojis.size === 1 ? "" : "s"} in this server`,
			value: `${staticEmojis.map(e => `\`:${e.name}:\` » ${e}`).join("\n")}`,
		});
		animatedEmojis.size && fields.push({
			name: `There ${animatedEmojis.size === 1 ? "is" : "are"} ${animatedEmojis.size} animated emoji${animatedEmojis.size === 1 ? "" : "s"} in this server`,
			value: `${animatedEmojis.map(e => `\`:${e.name}:\` » ${e}`).join("\n")}`,
		});
		msg.send({
			embed: {
				color: Colors.INFO,
				fields,
				footer: {
					text: `Want to learn more about an emoji? Run "${msg.guild.commandPrefix}emotes <custom emote>"`,
				},
			},
		});
	} else {
		msg.send({
			embed: {
				color: Colors.SOFT_ERR,
				description: `There aren't any custom emojis in this server! 🌋`,
			},
		});
	}
};
