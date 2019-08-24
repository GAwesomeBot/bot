module.exports = async ({ client, configJS, Constants: { Colors } }, msg, commandData) => {
	const { userDocument } = msg.author;
	if (msg.suffix) {
		if (msg.suffix.includes("|")) {
			const params = msg.suffix.split("|");
			const nick = params[0].trim();
			const svrid = params[1].trim();
			if (nick) {
				const serverNickQueryDocument = userDocument.query.id("server_nicks", nick);
				let svrname;
				try {
					svrname = (await client.api.guilds[svrid].get()).name;
				} catch (err) {
					svrname = null;
				}
				if (serverNickQueryDocument.val && serverNickQueryDocument.val._id) {
					if (!svrid || svrid === ".") {
						serverNickQueryDocument.remove();
						msg.send({
							embed: {
								color: Colors.SUCCESS,
								description: `Your server nick has been deleted. For future commands, you'll have to use the full server name instead of \`${nick}\`💀`,
							},
						});
					} else if (svrname) {
						await msg.send({
							embed: {
								color: Colors.PROMPT,
								description: `The nick \`${nick}\` already exists. Do you want to overwrite it?`,
								footer: {
									text: "You have 1 minute to respond.",
								},
							},
						});
						let response;
						try {
							response = await client.awaitPMMessage(msg.channel, msg.author, 300000);
						} catch (err) {
							return;
						}
						response = response.content;
						if (configJS.yesStrings.includes(response.toLowerCase().trim())) {
							serverNickQueryDocument.set("server_id", svrid);
							msg.send({
								embed: {
									color: Colors.SUCCESS,
									description: `Ok, \`${nick}\` now resolves to **${svrname}** 👍`,
								},
							});
						}
					} else {
						await msg.send({
							embed: {
								color: Colors.SOFT_ERR,
								description: `That server doesn't exist, or I'm not in it 😵`,
							},
						});
					}
				} else if (svrname) {
					userDocument.query.push("server_nicks", {
						_id: nick,
						server_id: svrid,
					});
					msg.send({
						embed: {
							color: Colors.SUCCESS,
							description: `You can now use \`${nick}\` in commands like \`say\` instead of **${svrname}**! ✨`,
						},
					});
				} else {
					msg.send({
						embed: {
							color: Colors.SOFT_ERR,
							description: `That server doesn't exist, or I'm not in it 😵`,
						},
					});
				}
			} else {
				logger.silly(`Invalid parameters \`${msg.suffix}\` provided for ${commandData.name}`, { usrid: msg.author.id });
				msg.send({
					embed: {
						color: Colors.INVALID,
						description: `🗯 Correct usage is: \`${commandData.name} ${commandData.usage}\``,
					},
				});
			}
		} else {
			logger.silly(`Invalid parameters \`${msg.suffix}\` provided for ${commandData.name}`, { usrid: msg.author.id });
			msg.send({
				embed: {
					color: Colors.INVALID,
					description: `🗯 Correct usage is: \`${commandData.name} ${commandData.usage}\``,
				},
			});
		}
	} else {
		const nicks = userDocument.server_nicks.map(serverNickDocument => serverNickDocument._id).sort();
		const fields = await Promise.all(nicks.map(async nick => {
			const serverNickDocument = userDocument.server_nicks.id(nick);
			let svrname;
			try {
				svrname = (await client.api.guilds[serverNickDocument.server_id].get()).name;
			} catch (err) {
				svrname = "invalid-server";
			}
			if (!svrname) svrname = "invalid-server";
			return {
				name: serverNickDocument._id,
				value: `${svrname}`,
			};
		}));
		if (fields.length) {
			msg.send({
				embed: {
					color: Colors.INFO,
					title: `**🔖 ${fields.length} server nick${fields.length === 1 ? "" : "s"}**`,
					fields: fields,
				},
			});
		} else {
			msg.send({
				embed: {
					color: Colors.INFO,
					title: "You haven't set any server nicks yet. 👽",
					description: "These are shortcuts that can be used in commands to reference a server.",
					footer: {
						text: `Get started with \`${commandData.name} ${commandData.usage}\``,
					},
				},
			});
		}
	}
};
