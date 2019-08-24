const { Giveaways } = require("../../Modules/");
const parseDuration = require("parse-duration");

module.exports = {
	find: async (main, filter) => {
		let server;
		const checkServer = svr => svr && svr.members.has(filter.usrid);

		server = main.client.guilds.find(svr => svr.name === filter.str || svr.name.toLowerCase() === filter.str.toLowerCase());
		if (checkServer(server)) return server.id;

		server = main.client.guilds.get(filter.str);
		if (checkServer(server)) return server.id;

		const userDocument = await Users.findOne(filter.usrid);
		if (userDocument) {
			const svrnick = userDocument.server_nicks.id(filter.str.toLowerCase());
			if (svrnick) {
				server = main.client.guilds.get(svrnick.server_id);
				if (checkServer(server)) return server.id;
			}
		}
		return false;
	},
	// Params: { initMsg: initMsg.id, usrid: msg.author.id, svrname, chname }
	run: async (main, { initMsg: initMsgID, usrid, chname, guildid }) => {
		const { Colors } = main.Constants;
		const usr = await main.client.users.fetch(usrid, true);
		try {
			const usrch = await usr.createDM();
			const initMsg = await usrch.messages.fetch(initMsgID);

			const svr = main.client.guilds.get(guildid);
			const member = svr.members.get(usr.id);
			const serverDocument = await Servers.findOne(svr.id);

			if (serverDocument.config.blocked.includes(usr.id)) return;

			let ch;
			try {
				ch = await main.client.channelSearch(chname, svr);
			} catch (err) {
				initMsg.edit({
					embed: {
						description: "Something went wrong while fetching channel data!",
						color: Colors.SOFT_ERR,
						footer: {
							text: `The requested channel was not found on server ${svr.name}`,
						},
					},
				});
			}

			if (ch && ch.type === "text") {
				const serverQueryDocument = serverDocument.query;

				let channelDocument = serverDocument.channels[ch.id];
				if (!channelDocument) {
					serverQueryDocument.push("channels", { _id: ch.id });
					channelDocument = serverDocument.channels[ch.id];
				}

				if (channelDocument.giveaway.isOngoing) {
					const channelQueryDocument = serverQueryDocument.clone.id("channels", channelDocument._id);
					if (channelDocument.giveaway.creator_id === usr.id) {
						await initMsg.edit({
							embed: {
								color: Colors.INFO,
								title: `The ongoing giveaway called "${channelDocument.giveaway.title}" in #${ch.name} is yours!`,
								description: "Would you like to end it now and let me choose a winner? 💗",
								footer: {
									text: "You have 1 minute to respond.",
								},
							},
						});
						let response;
						try {
							response = await main.client.awaitPMMessage(usrch, usr);
						} catch (err) {
							return;
						}
						if (response.content) response = response.content;
						if (main.configJS.yesStrings.includes(response.toLowerCase().trim())) {
							await Giveaways.end(main.client, svr, ch, serverDocument);
							serverDocument.save();
						} else {
							usrch.send({
								embed: {
									color: Colors.SUCCESS,
									description: "Alright! I'll leave your giveaway intact. 🐬",
								},
							});
						}
					} else if (channelDocument.giveaway.participant_ids.includes(usr.id)) {
						await initMsg.edit({
							embed: {
								color: Colors.INFO,
								title: `You're already joined the giveaway **${channelDocument.giveaway.title}** in #${ch.name} on ${svr.name}. 👍`,
								description: "Do you want to leave?",
								footer: {
									text: "You have 1 minute to respond.",
								},
							},
						});
						let response;
						try {
							response = await main.client.awaitPMMessage(usrch, usr);
						} catch (err) {
							return;
						}
						if (response.content) response = response.content;
						if (main.configJS.yesStrings.includes(response.toLowerCase().trim())) {
							channelQueryDocument.pull("giveaway.participant_ids", usr.id);
							await serverDocument.save();
							usrch.send({
								embed: {
									color: Colors.SUCCESS,
									description: "You got it! I removed you from the giveaway. 🙃",
									footer: {
										text: "Now you definitely won't win!",
									},
								},
							});
						} else {
							usrch.send({
								embed: {
									color: Colors.SUCCESS,
									description: "Alright! I'll leave you in. 🐬",
								},
							});
						}
					} else {
						await initMsg.edit({
							embed: {
								color: Colors.INFO,
								title: `There's a giveaway called "${channelDocument.giveaway.title}" going on in #${ch.name}.`,
								description: "Do you want to join for a chance to win? 🤑",
								footer: {
									text: "You have 1 minute to respond with yes or no.",
								},
							},
						});
						let response;
						try {
							response = await main.client.awaitPMMessage(usrch, usr);
						} catch (err) {
							return;
						}
						if (response.content) response = response.content;
						if (main.configJS.yesStrings.includes(response.toLowerCase().trim())) {
							channelQueryDocument.push("giveaway.participant_ids", usr.id);
							await serverDocument.save();
							usrch.send({
								embed: {
									color: Colors.SUCCESS,
									description: "Got it, good luck! 🎲",
								},
							});
						} else {
							usrch.send({
								embed: {
									color: Colors.SUCCESS,
									description: "Fine, you're the one missing out! 💸",
								},
							});
						}
					}
				} else if (main.client.getUserBotAdmin(svr, serverDocument, member) > serverDocument.config.commands.giveaway.admin_level || configJSON.maintainers.includes(usr.id)) {
					await initMsg.edit({
						embed: {
							color: Colors.INFO,
							title: "Let's create a new Giveaway. 🎁",
							description: "What would you like to give away? 🔑",
							footer: {
								text: "Only the winner will be able to view this text. You have 5 minutes to respond.",
							},
						},
					});
					let secret;
					try {
						secret = await main.client.awaitPMMessage(usrch, usr, 300000);
					} catch (err) {
						return;
					}
					if (secret.content) secret = secret.content;
					secret = secret.trim();

					await usrch.send({
						embed: {
							color: Colors.INFO,
							title: "Let's create a new Giveaway. 🎁",
							description: "What should I call the giveaway? 💬",
							footer: {
								text: "Make sure to include the item that's being given away. You have 5 minutes to respond.",
							},
						},
					});
					let title;
					try {
						title = await main.client.awaitPMMessage(usrch, usr, 300000);
					} catch (err) {
						return;
					}
					if (title.content) title = title.content;
					title = title.trim();

					await usrch.send({
						embed: {
							color: Colors.INFO,
							title: "Let's create a new Giveaway. 🎁",
							description: "How long do you want this giveaway to last? ⏱",
							footer: {
								text: "Enter `.` to use the default of 1 hour. You have 5 minutes to respond.",
							},
						},
					});
					let duration;
					try {
						duration = await main.client.awaitPMMessage(usrch, usr, 300000);
					} catch (err) {
						return;
					}
					if (duration.content) duration = duration.content;
					duration = duration.trim() === "." ? 3600000 : parseDuration(duration.trim());

					if (isNaN(duration) || duration <= 0) {
						await usrch.send({
							embed: {
								color: Colors.SOFT_ERR,
								title: "Let's create a new Giveaway. 🎁",
								description: "I didn't understand your duration input. ❓",
								footer: {
									text: "I made the giveaway last an hour instead.",
								},
							},
						});
						duration = 3600000;
					}
					Giveaways.start(main.client, svr, serverDocument, usr, ch, channelDocument, title, secret, duration);
					await serverDocument.save();
					usrch.send({
						embed: {
							color: Colors.SUCCESS,
							description: "Giveaway started! 🎁 I'm so excited!",
							footer: {
								text: `Check out #${ch.name} to see your giveaway in action!`,
							},
						},
					});
				} else {
					initMsg.edit({
						embed: {
							color: Colors.MISSING_PERMS,
							description: `🔐 You don't have permission to use this command on ${svr.name}`,
						},
					});
				}
			} else if (ch) {
				initMsg.edit({
					embed: {
						description: "Something went wrong while fetching channel data!",
						color: Colors.SOFT_ERR,
						footer: {
							text: `The requested channel isn't a valid text channel.`,
						},
					},
				});
			}
		} catch (err) {
			logger.warn(`Something went wrong while creating a giveaway! ()=()`, { usrid, msgid: initMsgID }, err);
			if (usr && usr.send) {
				usr.send({
					embed: {
						color: Colors.ERROR,
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
