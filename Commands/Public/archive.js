const { MessageAttachment: Attachment } = require("discord.js");
const moment = require("moment-timezone");

module.exports = async ({ Constants: { Colors, Text } }, documents, msg, commandData) => {
	if (msg.suffix) {
		let [count, lastID, ...other] = msg.suffix.split(" ");
		count = parseInt(count);
		if (isNaN(count) || !count || count <= 0) {
			return msg.sendInvalidUsage(commandData, "What's that number? 🤔");
		}
		if (count > 100) count = 100;
		let messages;
		try {
			messages = await msg.channel.messages.fetch({ limit: count, before: lastID ? lastID : msg.channel.lastMessageID });
			if (messages.size === 0) throw new Error(`Either there were no messages or I don't have the "Read Message History" permission in this channel`);
		} catch (err) {
			return msg.send({
				embed: {
					color: Colors.RED,
					title: `Uh-oh.. I was unable to fetch the message(s)!`,
					description: `The error message I got was \`\`\`${err}\`\`\``,
					footer: {
						text: `Make sure I have "Read Message History" in this channel or that the last ID is valid!`,
					},
				},
			});
		}
		messages = messages.map(message => ({
			author: {
				username: message.author.username,
				discriminator: message.author.discriminator,
				id: message.author.id,
				bot: message.author.bot,
				avatarURL: message.author.displayAvatarURL(),
			},
			id: message.id,
			createdAt: moment(message.createdAt).tz("Europe/London").format(`DD[.]MM[.]YYYY [at] HH[:]mm[:]ss [UTC]Z`),
			content: message.content || "",
			cleanContent: message.cleanContent || "",
			editedAt: message.editedAt ? moment(message.editedAt).tz("Europe/London").format(`DD[.]MM[.]YYYY [at] HH[:]mm[:]ss [UTC]Z`) : null,
			embeds: message.embeds.map(e => ({
				author: e.author ? {
					name: e.author.name || null,
					url: e.author.url || null,
					iconURL: e.author.iconURL || null,
				} : {},
				color: e.hexColor ? `0x${e.hexColor.replace("#", "").toUpperCase()}` : null,
				url: e.url || null,
				description: e.description || "",
				fields: e.fields || [],
				footer: e.footer ? {
					text: e.footer.text || null,
					iconURL: e.footer.iconURL || null,
				} : {},
				image: e.image ? e.image.url : null,
				thumbnail: e.thumbnail ? e.thumbnail.url : null,
				timestamp: e.timestamp || null,
				title: e.title || null,
				type: e.type || null,
			})),
			attachments: message.attachments.map(a => ({
				name: a.name,
				url: a.attachment,
			})),
		}));
		const resultData = {
			archiveTime: moment().tz("Europe/London").format(`DD[.]MM[.]YYYY [at] HH[:]mm[:]ss [UTC]Z`),
			archiveTimeUnix: Date.now(),
			serverName: msg.guild.name,
			serverID: msg.guild.id,
			channelName: msg.channel.name,
			channelID: msg.channel.id,
			archivedMessages: messages.length,
			messages,
		};
		const fileBuffer = Buffer.from(JSON.stringify(resultData, null, 2));
		try {
			await msg.channel.send({
				content: `Here you have the last ${messages.length} messages! ✅`,
				files: [new Attachment(fileBuffer, `archive-${msg.guild.name}-${msg.channel.name}-${Date.now()}.json`)],
			});
		} catch (err) {
			msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					title: `I was unable to send the archive...`,
					description: `The error I got was \`\`\`js\n${err.message}\`\`\``,
				},
			});
		}
	} else {
		logger.debug(`Archive number not provided for "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.send({
			embed: {
				color: Colors.LIGHT_RED,
				description: `I'll need a number of messages to archive, please! 🔢`,
			},
		});
	}
};
