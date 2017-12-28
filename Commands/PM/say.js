module.exports = async ({ bot, Constants: { Colors, Text } }, msg, commandData) => {
	if (msg.suffix && msg.suffix.includes("|")) {
		const params = msg.suffix.split("|");
		const svrname = params[0].trim();
		const chname = params[1].trim();
		if (svrname && chname) {
			const initMsg = await msg.channel.send({
				embed: {
					color: 0x3669FA,
					author: {
						name: bot.user.username,
						icon_url: bot.user.avatarURL(),
						url: "https://github.com/GilbertGobbels/GAwesomeBot",
					},
					description: "⌛ Fetching Data...",
					footer: {
						text: "Get excited!",
					},
				},
			});
			const relay = () => bot.relayCommand("say", { str: svrname, usrid: msg.author.id }, { initMsg: initMsg.id, usrid: msg.author.id, svrname, chname });
			setTimeout(async () => {
				const relayRes = await relay();
				let errMsg = "An unknown Error occurred";
				if (relayRes === "none") errMsg = "The requested server was not found. Double check for typo's!";
				if (relayRes === "multi") errMsg = "Multiple servers were found. Set a unique server nick or use server ID instead of name.";
				if (relayRes !== true) {
					initMsg.edit({
						embed: {
							author: {
								name: bot.user.username,
								icon_url: bot.user.avatarURL(),
								url: "https://github.com/GilbertGobbels/GAwesomeBot",
							},
							description: "Something went wrong while fetching server data!",
							color: Colors.ERROR,
							footer: {
								text: errMsg,
							},
						},
					});
				}
			}, 200);
			return;
		}
	}
	winston.silly(`Invalid parameters \`${msg.suffix}\` provided for ${commandData.name}`, { usrid: msg.author.id });
	msg.channel.send({
		embed: {
			color: Colors.INVALID,
			description: Text.INVALID_USAGE(commandData),
		},
	});
};
