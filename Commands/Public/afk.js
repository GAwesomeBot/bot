/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if (suffix) {
		if (suffix === ".") {
			memberDocument.afk_message = null;
			msg.channel.createMessage({
				embed: {
					color: 0x9ECDF2,
					title: "Welcome back! 🎊",
					description: "I removed your AFK message",
					footer: {
						text: `You can add it back by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} message"`,
					},
				},
			});
		} else {
			memberDocument.afk_message = suffix;
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					description: `Alright, I'll show that when someone mentions you on this server. 👌`,
					footer: {
						text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ." to remove it`,
					},
				},
			});
		}
	} else {
		// eslint-disable-next-line no-lonely-if
		if (memberDocument.afk_message) {
			msg.channel.createMessage({
				embed: {
					color: 0x9ECDF2,
					description: `You have the AFK message \`${memberDocument.afk_message}\` set on this server 💭`,
					footer: {
						text: `You can remove it by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ."`,
					},
				},
			});
		} else {
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					description: "You don't have an AFK message set on this server! ⌨",
					footer: {
						text: `You can set one by using "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} message"`,
					},
				},
			});
		}
	}
};
