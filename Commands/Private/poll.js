const { Polls } = require("../../Modules/");

module.exports = {
	find: async (main, filter) => {
		let server;
		const checkServer = svr => svr && svr.members.has(filter.usrid);

		server = main.bot.guilds.find(svr => svr.name === filter.str || svr.name.toLowerCase() === filter.str.toLowerCase());
		if (checkServer(server)) return server.id;

		server = main.bot.guilds.get(filter.str);
		if (checkServer(server)) return server.id;

		const userDocument = await Users.findOne({ _id: filter.usrid }).exec();
		if (userDocument) {
			const svrnick = userDocument.server_nicks.id(filter.str.toLowerCase());
			if (svrnick) {
				server = main.bot.guilds.get(svrnick.server_id);
				if (checkServer(server)) return server.id;
			}
		}
		return false;
	},
	run: async (main, params) => {
		const usr = await main.bot.users.fetch(params.usrid, true);
		try {
			const usrch = await usr.createDM();
			const initMsg = await usrch.messages.fetch(params.initMsg);

			const svr = main.bot.guilds.get(params.guildid);
			const member = svr.members.get(usr.id);
			const serverDocument = svr.serverDocument;

			if (serverDocument.config.blocked.includes(usr.id)) return;

			let ch;
			try {
				ch = await main.bot.channelSearch(params.chname, svr);
			} catch (err) {
				initMsg.edit({
					embed: {
						author: {
							name: main.bot.user.username,
							icon_url: main.bot.user.avatarURL(),
							url: "https://github.com/GilbertGobbels/GAwesomeBot",
						},
						description: "Something went wrong while fetching channel data!",
						color: 0xFF0000,
						footer: {
							text: `The requested channel was not found on server ${svr.name}`,
						},
					},
				});
			}

			if (ch && ch.type === "text") {
				let channelDocument = serverDocument.channels.id(ch.id);
				if (!channelDocument) {
					serverDocument.channels.push({ _id: ch.id });
					channelDocument = serverDocument.channels.id(ch.id);
				}
				if (channelDocument.poll.isOngoing) {
					if (channelDocument.poll.creator_id === usr.id) {
						await initMsg.edit({
							embed: {
								author: {
									name: main.bot.user.username,
									icon_url: main.bot.user.avatarURL(),
									url: "https://github.com/GilbertGobbels/GAwesomeBot",
								},
								color: 0x3669FA,
								description: `You've already started a poll (called \`${channelDocument.poll.title}\`) in #${ch.name}. Would you like to end it now and show the results?`,
								footer: {
									text: "You have 1 minute to respond.",
								},
							},
						});
						let response;
						try {
							response = await main.bot.awaitPMMessage(usrch, usr);
						} catch (err) {
							return;
						}
						if (response && response.content) response = response.content;
						if (response && main.configJS.yesStrings.includes(response.toLowerCase().trim())) {
							await Polls.end(serverDocument, ch, channelDocument);
							usrch.send({
								embed: {
									author: {
										name: main.bot.user.username,
										icon_url: main.bot.user.avatarURL(),
										url: "https://github.com/GilbertGobbels/GAwesomeBot",
									},
									color: 0x00FF00,
									description: "Alright, poll ended. 🍿",
									footer: {
										text: `See #${ch.name} for the results!`,
									},
								},
							});
							serverDocument.save();
						} else {
							usrch.send({
								embed: {
									author: {
										name: main.bot.user.username,
										icon_url: main.bot.user.avatarURL(),
										url: "https://github.com/GilbertGobbels/GAwesomeBot",
									},
									color: 0x00FF00,
									description: `Alright! I'll leave your poll intact. 🐬`,
								},
							});
							return true;
						}
					} else {
						const voteDocument = channelDocument.poll.responses.id(usr.id);
						if (voteDocument) {
							await initMsg.edit({
								embed: {
									author: {
										name: main.bot.user.username,
										icon_url: main.bot.user.avatarURL(),
										url: "https://github.com/GilbertGobbels/GAwesomeBot",
									},
									color: 0x3669FA,
									description: `You've already voted on the poll in #${ch.name}. Would you like to erase your vote?`,
									footer: {
										text: "You have 1 minute to respond.",
									},
								},
							});
							let response;
							try {
								response = await main.bot.awaitPMMessage(usrch, usr);
							} catch (err) {
								return;
							}
							if (response && response.content) response = response.content;
							if (response && main.configJS.yesStrings.includes(response.toLowerCase().trim())) {
								voteDocument.remove();
								serverDocument.save();
								usrch.send({
									embed: {
										author: {
											name: main.bot.user.username,
											icon_url: main.bot.user.avatarURL(),
											url: "https://github.com/GilbertGobbels/GAwesomeBot",
										},
										color: 0x00FF00,
										description: `Alright, I removed your vote. 🔪 Use \`${response}\` to vote again, anonymously.`,
									},
								});
							} else {
								usrch.send({
									embed: {
										author: {
											name: main.bot.user.username,
											icon_url: main.bot.user.avatarURL(),
											url: "https://github.com/GilbertGobbels/GAwesomeBot",
										},
										color: 0x00FF00,
										description: `Alright! I'll leave your vote intact. 🐬`,
									},
								});
								return true;
							}
						} else {
							let embed_fields = [];
							channelDocument.poll.options.forEach((option, i) => {
								embed_fields.push({
									name: `${i}`,
									value: `${option}`,
									inline: true,
								});
							});

							await initMsg.edit({
								embed: {
									author: {
										name: main.bot.user.username,
										icon_url: main.bot.user.avatarURL(),
										url: "https://github.com/GilbertGobbels/GAwesomeBot",
									},
									color: 0x3669FA,
									title: `There's a poll in #${ch.name} called "${channelDocument.poll.title}". ⚔`,
									description: "To vote anonymously, select one of the following options:",
									fields: embed_fields,
									footer: {
										text: "You have 1 minute to respond using the numbers matched to the options shown above.",
									},
								},
							});
							let response;
							try {
								response = await main.bot.awaitPMMessage(usrch, usr, 60000, msg => {
									msg.content = msg.content.trim();
									return msg.content && !isNaN(msg.content) && msg.content >= 0 && msg.content < channelDocument.poll.options.length;
								});
							} catch (err) {
								return;
							}
							if (!response) return;
							if (response.content) response = response.content;
							const vote = parseInt(response.trim());
							channelDocument.poll.responses.push({
								_id: usr.id,
								vote,
							});
							serverDocument.save();
							usrch.send({
								embed: {
									author: {
										name: main.bot.user.username,
										icon_url: main.bot.user.avatarURL(),
										url: "https://github.com/GilbertGobbels/GAwesomeBot",
									},
									color: 0x00FF00,
									description: `🎈 I casted your vote for \`${channelDocument.poll.options[vote]}\``,
								},
							});
						}
					}
				} else if (main.bot.getUserBotAdmin(svr, serverDocument, member) >= serverDocument.config.commands.poll.admin_level || configJSON.maintainers.includes(usr.id)) {
					initMsg.edit({
						embed: {
							author: {
								name: main.bot.user.username,
								icon_url: main.bot.user.avatarURL(),
								url: "https://github.com/GilbertGobbels/GAwesomeBot",
							},
							color: 0x3669FA,
							description: "❓ Enter a title or question for the poll:",
							footer: {
								text: "You have 1 minute to respond.",
							},
						},
					});
					let title;
					try {
						title = await main.bot.awaitPMMessage(usrch, usr);
					} catch (err) {
						return;
					}
					if (!title) return;
					if (title.content) title = title.content;
					usrch.send({
						embed: {
							author: {
								name: main.bot.user.username,
								icon_url: main.bot.user.avatarURL(),
								url: "https://github.com/GilbertGobbels/GAwesomeBot",
							},
							color: 0x3669FA,
							description: "✍ Enter options for poll (comma-separated):",
							footer: {
								text: "Enter `.` to use the default yes/no options. You have 5 minutes to respond.",
							},
						},
					});
					let options;
					try {
						options = await main.bot.awaitPMMessage(usrch, usr, 300000);
					} catch (err) {
						return;
					}
					if (!options) return;
					if (options.content) options = options.content;
					options = options.trim() === "." ? ["No", "Yes"] : options.split(",");

					Polls.start(main.bot, svr, serverDocument, usr, ch, channelDocument, title, options);

					let fields = [];
					options.forEach((option, i) => {
						fields.push({
							name: `${i}`,
							value: `${option}`,
							inline: true,
						});
					});
					usrch.send({
						embed: {
							author: {
								name: main.bot.user.username,
								icon_url: main.bot.user.avatarURL(),
								url: "https://github.com/GilbertGobbels/GAwesomeBot",
							},
							color: 0x00FF00,
							description: `🍻 Poll named ${title} created with the options:`,
							fields,
							footer: {
								text: `Check out #${ch.name} to see your poll in action!`,
							},
						},
					});
					await serverDocument.save();
				} else {
					initMsg.edit({
						embed: {
							author: {
								name: main.bot.user.username,
								icon_url: main.bot.user.avatarURL(),
								url: "https://github.com/GilbertGobbels/GAwesomeBot",
							},
							color: 0xE55B0A,
							description: `🔐 You don't have permission to use this command on ${svr.name}`,
						},
					});
				}
			} else if (ch) {
				initMsg.edit({
					embed: {
						author: {
							name: main.bot.user.username,
							icon_url: main.bot.user.avatarURL(),
							url: "https://github.com/GilbertGobbels/GAwesomeBot",
						},
						description: "Something went wrong while fetching channel data!",
						color: 0xFF0000,
						footer: {
							text: `The requested channel isn't a valid text channel.`,
						},
					},
				});
			}
		} catch (err) {
			winston.warn(`Something went wrong while creating a poll! ()=()\n`, err, { usrid: params.usrid, initMsgID: params.initMsg });
			if (usr && usr.send) {
				usr.send({
					embed: {
						color: 0xFF0000,
						title: `Something went wrong! 😱`,
						description: `**Error Message**: \`\`\`js\n${err.stack}\`\`\``,
						footer: {
							text: `Contact your Server Admin for support!`,
						},
					},
				});
			}
		}
	},
};
