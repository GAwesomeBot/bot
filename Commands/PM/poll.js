module.exports = async (main, msg, commandData) => {
	if (msg.suffix && msg.suffix.includes("|")) {
		const params = msg.suffix.split("|");
		const svrid = params[0].trim();
		const chname = params[1].trim();
		if (svrid && chname) {
			const initMsg = await msg.channel.send({
				embed: {
					color: 0x3669FA,
					author: {
						name: main.client.user.username,
						icon_url: main.client.user.displayAvatarURL(),
						url: "https://github.com/GilbertGobbels/GAwesomeBot",
					},
					description: "⌛ Preparing Poll...",
					footer: {
						text: "Please wait; we're working hard behind the scenes!",
					},
				},
			});
			const relayRes = await main.client.relayCommand("poll", { str: svrid, usrid: msg.author.id }, { initMsg: initMsg.id, usrid: msg.author.id, svrid, chname });
			let errMsg = "An unknown Error occurred";
			if (relayRes === "none") errMsg = "The requested server was not found. Double check for typo's!";
			if (relayRes === "multi") errMsg = "Multiple servers were found. Set a unique server nick or use server ID instead of name.";
			if (relayRes !== true) {
				initMsg.edit({
					embed: {
						author: {
							name: main.client.user.username,
							icon_url: main.client.user.displayAvatarURL(),
							url: "https://github.com/GilbertGobbels/GAwesomeBot",
						},
						description: "Something went wrong while fetching server data!",
						color: 0xFF0000,
						footer: {
							text: errMsg,
						},
					},
				});
			}
			return;
		}
	}
	logger.silly(`Invalid parameters \`${msg.suffix}\` provided for ${commandData.name}`, { usrid: msg.author.id });
	msg.send({
		embed: {
			author: {
				name: main.client.user.username,
				icon_url: main.client.user.displayAvatarURL(),
				url: "https://github.com/GilbertGobbels/GAwesomeBot",
			},
			color: 0xFFFF00,
			description: `🗯 Correct usage is: \`${commandData.name} ${commandData.usage}\``,
		},
	});
};
