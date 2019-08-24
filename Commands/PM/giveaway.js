module.exports = async ({ client, Constants: { Colors } }, msg, commandData) => {
	if (msg.suffix && msg.suffix.includes("|")) {
		const params = msg.suffix.split("|");
		const svrname = params[0].trim();
		const chname = params[1].trim();
		if (svrname && chname) {
			const initMsg = await msg.channel.send({
				embed: {
					color: 0x3669FA,
					author: {
						name: client.user.username,
						icon_url: client.user.displayAvatarURL(),
						url: "https://github.com/GilbertGobbels/GAwesomeBot",
					},
					description: "⌛ Preparing Giveaway...",
					footer: {
						text: "Get excited!",
					},
				},
			});
			if (!initMsg) return logger.debug(`Failed to send message for giveaway command to ${msg.author.tag}.`, { usrid: msg.author.id, msgid: msg.id });
			const relay = () => client.relayCommand("giveaway", { str: svrname, usrid: msg.author.id }, { initMsg: initMsg.id, usrid: msg.author.id, svrname, chname });
			setTimeout(async () => {
				const relayRes = await relay();
				let errMsg = "An unknown Error occurred";
				if (relayRes === "none") errMsg = "The requested server was not found. Double check for typo's!";
				if (relayRes === "multi") errMsg = "Multiple servers were found. Set a unique server nick or use server ID instead of name.";
				if (relayRes !== true) {
					initMsg.edit({
						embed: {
							author: {
								name: client.user.username,
								icon_url: client.user.displayAvatarURL(),
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
	logger.silly(`Invalid parameters \`${msg.suffix}\` provided for ${commandData.name}`, { usrid: msg.author.id });
	await msg.send({
		embed: {
			color: Colors.INVALID,
			description: `🗯 Correct usage is: \`${commandData.name} ${commandData.usage}\``,
		},
	});
};
