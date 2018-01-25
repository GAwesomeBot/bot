const { MessageAttachment: Attachment } = require("discord.js");
const moment = require("moment-timezone");

module.exports = async ({ Constants: { Colors } }, documents, msg, commandData) => {
	if (msg.suffix) {
		let [count, lastID, ...other] = msg.suffix.split(" ");
		count = parseInt(count);
		if (count > 100 || isNaN(count) || !count || count <= 0) count = 100;
		const archive = [];
		let messages;
		let success = true;
		try {
			messages = await msg.channel.messages.fetch({ limit: count || 50, before: lastID ? lastID : msg.channel.lastMessageID });
			if (messages.size === 0) throw new Error(`Either there were no messages or I don't have the "Read Message History" permission in this channel`);
		} catch (err) {
			return msg.channel.send({
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
		messages.forEach(message => {
			archive.push({
				author: {
					username: message.author.username,
					discriminator: message.author.discriminator,
					id: message.author.id,
					bot: message.author.bot,
					avatarURL: message.author.displayAvatarURL(),
				},
				createdAt: `${moment(message.createdAt).tz("Europe/London").format(`DD[.]MM[.]YYYY [at] HH[:]mm[:]ss [UTC]Z`)}`,
				content: message.content,
				cleanContent: message.cleanContent,
				editedAt: `${message.editedAt ? moment(message.editedAt).tz("Europe/London").format(`DD[.]MM[.]YYYY [at] HH[:]mm[:]ss [UTC]Z`) : "Message wasn't edited"}`,
				embeds: message.embeds.map(e => ({
					author: e.author || {},
					color: e.hexColor ? `0x${e.hexColor.replace("#", "").toUpperCase()}` : null,
					description: e.description,
					fields: e.fields || [],
					footer: e.footer || {},
					image: e.image ? e.image.url : null,
					timestamp: `${e.timestamp}`,
					title: e.title,
					type: e.type,
					url: e.url || null,
				})),
				id: message.id,
			});
		});
		const fileBuffer = Buffer.from(JSON.stringify(archive, null, 2));
		try {
			await msg.channel.send({
				content: `Here you go! ✅`,
				files: [new Attachment(fileBuffer, `archive-${msg.guild.name}-${msg.channel.name}-${Date.now()}.json`)],
			});
		} catch (err) {
			msg.channel.send({
				embed: {
					color: Colors.SOFT_ERR,
					title: `I was unable to send the archive...`,
					description: `The error I got was \`\`\`js\n${err.message}\`\`\``,
				},
			});
		}
	} else {
		winston.verbose(`Archive number not provided for "${commandData.name}" command`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.send({
			embed: {
				color: Colors.LIGHT_RED,
				description: `I'll need a number of messages to archive, please! 🔢`,
			},
		});
	}
};
