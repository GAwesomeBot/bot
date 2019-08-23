const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");
const duration = require("../../Modules/MessageUtils/DurationParser");
const setCountdown = require("../../Modules/Utils/SetCountdown");
const moment = require("moment");

module.exports = async ({ client, Constants: { Colors, Text } }, { serverDocument, serverQueryDocument }, msg, commandData) => {
	if (msg.suffix) {
		if (msg.suffix.includes("|") || msg.suffix.includes(" in ")) {
			const res = await duration(msg.suffix);
			const { error, event, time } = res;
			let countdownDocument = serverDocument.config.countdown_data.id(event.toLowerCase().trim());
			if (countdownDocument) {
				msg.send({
					embed: {
						color: Colors.INFO,
						title: `__${countdownDocument._id}__ already exists. ⏰`,
						description: `It expires **${moment(countdownDocument.expiry_timestamp).fromNow()}**`,
					},
				});
			} else if (error) {
				msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `You've provided an invalid time for the countdown! 😶`,
						footer: {
							text: `Please make sure you use the syntax "${msg.guild.commandPrefix}${commandData.name} ${commandData.usage}" when creating countdowns`,
						},
					},
				});
			} else {
				const expiry = Date.now() + time;
				serverQueryDocument.push("config.countdown_data", {
					_id: event.toLowerCase().trim(),
					channel_id: msg.channel.id,
					expiry_timestamp: expiry,
				});
				countdownDocument = serverDocument.config.countdown_data.id(event.toLowerCase().trim());
				await setCountdown(client, serverDocument, countdownDocument);
				msg.send({
					embed: {
						color: Colors.SUCCESS,
						title: `Got it 👌`,
						description: `**${countdownDocument._id}** is set to expire **${moment(expiry).fromNow()}**`,
					},
				});
			}
		} else {
			const countdownDocument = serverDocument.config.countdown_data.id(msg.suffix.trim().toLowerCase());
			if (countdownDocument) {
				msg.send({
					embed: {
						color: Colors.RESPONSE,
						description: `\`${countdownDocument._id}\` expires **${moment(countdownDocument.expiry_timestamp).fromNow()}** ⌛️`,
					},
				});
			} else {
				msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						description: `That countdown doesn't exist in this server!`,
						footer: {
							text: `Use "${msg.guild.commandPrefix}${commandData.name} ${msg.suffix} | <time>" to create it`,
						},
					},
				});
			}
		}
	} else {
		const countdowns = serverDocument.config.countdown_data
			.filter(countdownDoc => msg.guild.channels.has(countdownDoc.channel_id))
			.sort((a, b) => a.expiry_timestamp - b.expiry_timestamp);
		if (countdowns.length) {
			const arr = countdowns.map(countdown => [
				`» **${countdown._id}** «`,
				`\tIn #${msg.guild.channel(countdown.channel_id).name} (${msg.guild.channel(countdown.channel_id)})`,
				`\tExpires **${moment(countdown.expiry_timestamp).fromNow()}**`,
			].join("\n"));
			const chunks = arr.chunk(10);
			const descriptions = [];
			for (const chunk of chunks) descriptions.push(chunk.join("\n\n"));
			await new PaginatedEmbed(msg, {
				title: `There ${arr.length === 1 ? "is" : "are"} ${arr.length} countdown${arr.length === 1 ? "" : "s"} on "${msg.guild}" 🎆`,
				color: Colors.INFO,
			}, {
				descriptions,
			}).init();
		} else {
			msg.send({
				embed: {
					color: Colors.INFO,
					description: `There are no countdowns in this server 📅`,
					footer: {
						text: `Use "${msg.guild.commandPrefix}${commandData.name} ${commandData.usage}" to start one`,
					},
				},
			});
		}
	}
};
