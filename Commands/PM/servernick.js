module.exports = (bot, db, config, winston, userDocument, msg, suffix, commandData) => {
	if(suffix) {
		if(suffix.indexOf("|")>-1) {
			const nick = suffix.substring(0, suffix.indexOf("|")).trim();
			const svrname = suffix.substring(suffix.indexOf("|")+1).trim();
			if(nick) {
				const serverNickDocument = userDocument.server_nicks.id(nick);
				if(serverNickDocument) {
					if(!svrname || svrname==".") {
						serverNickDocument.remove();
						userDocument.save(err => {
							if(err) {
								winston.error("Failed to save user data for server nicks", {usrid: msg.author.id}, err);
							}
							msg.channel.createMessage(`💀 Deleted. Next time, you'll have to use the full server name instead of \`${nick}\``);
						});
					} else {
						const svr = bot.guilds.get(serverNickDocument.server_id);
						if(svr) {
							const targetSvr = bot.serverSearch(svrname, msg.author, userDocument);
							if(targetSvr) {
								msg.channel.createMessage(`The nick \`${nick}\` already exists. Do you want to overwrite it?`).then(() => {
									bot.awaitMessage(msg.channel.id, msg.author.id, message => {
										if(config.yes_strings.indexOf(message.content.toLowerCase().trim())>-1) {
											serverNickDocument.server_id = targetSvr.id;
											userDocument.save(err => {
												if(err) {
													winston.error("Failed to save user data for server nicks", {usrid: msg.author.id}, err);
												}
												msg.channel.createMessage(`Ok, \`${nick}\` now points to **${targetSvr.name}** 👍`);
											});
										}
									});
								});
							} else {
								msg.channel.createMessage(`Uhhh...You're trying to overwrite the nick \`${nick}\` with something that isn't even valid!`);
							}
						} else {
							serverNickDocument.server_id = svr.id;
							userDocument.save(err => {
								if(err) {
									winston.error("Failed to save user data for server nicks", {usrid: msg.author.id}, err);
								}
								msg.channel.createMessage(`You already had a nick called \`${nick}\` set, but it was invalid so now it points to **${svr.name}** 👍`);
							});
						}
					}
				} else if(svrname) {
					const svr = bot.serverSearch(svrname, msg.author, userDocument);
					if(svr) {
						userDocument.server_nicks.push({
							_id: nick,
							server_id: svr.id
						});
						userDocument.save(err => {
							if(err) {
								winston.error("Failed to save user data for server nicks", {usrid: msg.author.id}, err);
							}
							msg.channel.createMessage(`Now you can use \`${nick}\` in commands like \`config\` to access ${svr.name}! Here's a donut: 🍩`);
						});
					} else {
						msg.channel.createMessage(`👾 I'm not on that server or it's not valid or something like that. Either way, I can't create a server nick for ${svrname}`);
					}
				} else {
					winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {usrid: msg.author.id});
					msg.channel.createMessage(`That's not how you add a server nick. Use \`${commandData.name} ${nick}|<server>\``);
				}
			} else {
				winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {usrid: msg.author.id});
				msg.channel.createMessage(`That's not how you set a server nick. Use \`${commandData.name} <nick>|<server>\``);
			}
		} else {
			const serverNickDocument = userDocument.server_nicks.id(suffix.toLowerCase());
			if(serverNickDocument) {
				const svr = bot.guilds.get(serverNickDocument.server_id);
				if(svr && svr.members.has(msg.author.id)) {
					msg.channel.createMessage(`The nick \`${suffix.toLowerCase()}\` maps to **${svr.name}** 🔖`);
				} else {
					serverNickDocument.remove();
					userDocument.save(err => {
						if(err) {
							winston.error("Failed to save user data for server nicks", {usrid: msg.author.id}, err);
						}
						msg.channel.createMessage("Hmmm, that nick expired or something. I deleted it.");
					});
				}
			} else {
				msg.channel.createMessage(`Server nick \`${suffix.toLowerCase()}\` not found. Use \`${commandData.name} ${suffix.toLowerCase()}|<server>\` to create it 🍭`);
			}
		}
	} else {
		const info = userDocument.server_nicks.filter(serverNickDocument => {
			return bot.guilds.has(serverNickDocument.server_id);
		}).map(serverNickDocument => {
			const svr = bot.guilds.get(serverNickDocument.server_id);
			return `${serverNickDocument._id}: ${svr.name}`;
		}).sort();
		if(info.length>0) {
			msg.channel.createMessage(`**🔖 ${info.length} server nick${info.length==1 ? "" : "s"}**\n\t${info.join("\n\t")}`);
		} else {
			msg.channel.createMessage(`You haven't set any server nicks yet. These are shortcuts that can be used in commands like \`config\` to access a server without typing its full name. Get started with \`${commandData.name} <nick>|<server>\``);
		}
	}
};
