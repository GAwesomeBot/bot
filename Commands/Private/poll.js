const { Polls } = require("../../Modules/");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");
const { Colors, Text } = require("../../Internals/Constants");

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
			let initMsg = await usrch.messages.fetch(params.initMsg);

			const svr = main.bot.guilds.get(params.guildid);
			const member = svr.members.get(usr.id);
			const serverDocument = svr.serverDocument;

			if (serverDocument.config.blocked.includes(usr.id)) return;

			let ch;
			try {
				ch = await main.bot.channelSearch(params.chname, svr);
			} catch (err) {
				return initMsg.edit({
					embed: {
						description: "Something went wrong while fetching channel data!",
						color: Colors.ERROR,
						footer: {
							text: `The requested channel was not found on server "${svr}"`,
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
						initMsg = await initMsg.edit({
							embed: {
								color: Colors.INFO,
								description: `You've already started a poll (called \`${channelDocument.poll.title}\`) in #${ch.name} (${ch}).`,
								footer: {
									text: "Would you like to end it now and show the results? | You have 1 minute to respond.",
								},
							},
						});
						let response;
						try {
							response = await main.bot.awaitPMMessage(usrch, usr);
						} catch (_) {
							return;
						}
						if (response && response.content) response = response.content;
						if (response && main.configJS.yesStrings.includes(response.toLowerCase().trim())) {
							await Polls.end(serverDocument, ch, channelDocument);
							usrch.send({
								embed: {
									color: Colors.SUCCESS,
									title: "Alright, poll ended. 🍿",
									description: `See #${ch.name} (${ch}) for the results!`,
								},
							});
							serverDocument.save();
						} else {
							usrch.send({
								embed: {
									color: Colors.RESPONSE,
									description: `Alright! I'll leave your poll intact. 🐬`,
								},
							});
							return true;
						}
					} else {
						const voteDocument = channelDocument.poll.responses.id(usr.id);
						if (voteDocument) {
							initMsg = await initMsg.edit({
								embed: {
									color: 0x3669FA,
									description: `You've already voted on the poll in #${ch.name} (${ch}).`,
									footer: {
										text: "Would you like to erase your vote? | You have 1 minute to respond.",
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
										color: Colors.SUCCESS,
										description: `Alright, I removed your vote. 🔪`,
										footer: {
											text: `Use "poll ${svr} | #${ch.name}" to vote again, anonymously.`,
										},
									},
								});
							} else {
								usrch.send({
									embed: {
										color: Colors.RESPONSE,
										description: `Alright! I'll leave your vote as is. 🐬`,
									},
								});
								return true;
							}
						} else {
							let map = [];
							channelDocument.poll.options.forEach((option, i) => {
								map.push([
									`» ${i + 1} «`,
									`\t**${option}**`,
								].join("\n"));
							});
							map = map.chunk(10);
							const options = [];
							for (const innerArray of map) {
								options.push(innerArray.join("\n"));
							}
							const menu = new PaginatedEmbed({
								channel: initMsg.channel,
								author: {
									id: usr.id,
								},
							}, options, {
								footer: `You have 4 minute to respond using the number matched to the options shown above.`,
								title: `There's a poll in #${ch.name} called "__${channelDocument.poll.title}__" ⚔`,
								description: `To vote anonymously, please select one of the following options.\n**Note** You may need to remove and re-add your reaction for page changes!\n\n{description}`,
								color: Colors.INFO,
							});
							await initMsg.delete();
							await menu.init();
							let response;
							try {
								response = await main.bot.awaitPMMessage(usrch, usr, 240000, msg => {
									msg.content = msg.content.trim();
									return msg.content && !isNaN(msg.content) && msg.content > 0 && msg.content <= channelDocument.poll.options.length;
								});
							} catch (_) {
								return;
							}
							if (!response) return;
							if (response.content) response = response.content;
							let vote = parseInt(response.trim());
							vote--;
							channelDocument.poll.responses.push({
								_id: usr.id,
								vote,
							});
							serverDocument.save();
							usrch.send({
								embed: {
									color: Colors.SUCCESS,
									description: `I casted your vote for \`${channelDocument.poll.options[vote]}\` 🎈`,
								},
							});
						}
					}
				} else if (main.bot.getUserBotAdmin(svr, serverDocument, member) >= serverDocument.config.commands.poll.admin_level || configJSON.maintainers.includes(usr.id)) {
					initMsg = await initMsg.edit({
						embed: {
							color: Colors.PROMPT,
							description: "❓ Enter a title or question for the poll.",
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
							color: Colors.PROMPT,
							description: "✍ Please enter the options for your poll (comma-separated):",
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
					options = options.trim() === "." ? ["No", "Yes"] : options.split(",").trimAll();

					Polls.start(main.bot, svr, serverDocument, usr, ch, channelDocument, title, options);

					let map = options.map((option, i) => [
						`» ${i + 1} «`,
						`\t**${option}**`,
					].join("\n"));
					map = map.chunk(10);
					const description = [];
					for (const innerArray of map) {
						description.push(innerArray.join("\n"));
					}
					const menu = new PaginatedEmbed({
						channel: initMsg.channel,
						author: {
							id: usr.id,
						},
					}, description, {
						title: `🍻 Poll named "__${title}__" has started!`,
						color: Colors.SUCCESS,
						description: `Check out #${ch.name} (${ch}) to see your poll in action!\nHere are the polls options:\n\n{description}`,
						footer: ``,
					});
					await menu.init();
					await serverDocument.save();
				} else {
					initMsg.edit({
						embed: {
							color: Colors.MISSING_PERMS,
							description: `🔐 You don't have permission to use this command on ${svr}`,
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
			winston.warn(`Something went wrong while creating a poll! ()=()\n`, err, { usrid: params.usrid, initMsgID: params.initMsg });
			if (usr && usr.send) {
				usr.send({
					embed: {
						color: Colors.ERR,
						title: Text.COMMAND_ERR(),
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
