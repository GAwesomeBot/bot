const hastebin = require("./../../Modules/HastebinUpload.js");

/* eslint-disable max-len */
module.exports = async (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const showList = async (edit = false, _msg) => {
		let _lists = [];
		const template = (completed = false, number, content) => {
			const string = `• **${++number}** | ${completed ? "✅" : "📝"}\n**»** ${content}`;
			return string;
		};
		serverDocument.config.list_data.map((listDocument, i) => {
			_lists.push(template(listDocument.isCompleted, i, listDocument.content));
		});
		const lists = _lists.join("\n");
		if (edit && _msg) {
			if (lists.length >= 2040) {
				const listURL = await hastebin(lists.replace(/\*\*/g, ""));
				_msg.edit({
					embed: {
						color: 0xFFFF00,
						description: `There are soo many lists in this server, I can't show them all.. 😓\nYou can however click [here](${listURL}) to see them all`,
						footer: {
							text: `I've never seen a server have soo many lists before.. It's like going shopping with your mom.`,
						},
					},
				});
			} else if (lists.length !== 0) {
				_msg.edit({
					embed: {
						color: 0x00FF00,
						author: {
							name: `Here are all the lists available in this server`,
						},
						description: lists,
					},
				});
			} else {
				_msg.edit({
					embed: {
						color: 0xFF0000,
						description: `There are no more To-Do List items in here! ❎`,
						footer: {
							text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <content>" to add one.`,
						},
					},
				});
			}
		} else if (lists.length >= 2040) {
			const listURL = await hastebin(lists.replace(/\*\*/g, ""));
			msg.channel.createMessage({
				embed: {
					color: 0xFFFF00,
					description: `There are soo many lists in this server, I can't show them all.. 😓\nYou can however click [here](${listURL}) to see them all`,
					footer: {
						text: `I've never seen a server have soo many lists before.. It's like going shopping with your mom.`,
					},
				},
			});
		} else if (lists.length !== 0) {
			msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					author: {
						name: `Here are all the lists available in this server`,
					},
					description: lists,
				},
			});
		} else {
			msg.channel.createMessage({
				embed: {
					color: 0xFF0000,
					description: `There are no To-Do List items in here! ❎`,
					footer: {
						text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <content>" to add one.`,
					},
				},
			});
		}
	};
	if (suffix) {
		if (suffix.includes("|")) {
			const args = suffix.split("|");
			if (args[0].trim() && !isNaN(args[0].trim())) {
				const i = parseInt(args[0].trim()) - 1,
					action = args[1].trim();
				if (i >= 0 && i < serverDocument.config.list_data.length) {
					let id = i;
					switch (action.toLowerCase()) {
					case "":
					case ".": {
						serverDocument.config.list_data.splice(i, 1);
						let m = await msg.channel.createMessage({
							embed: {
								color: 0x00FF00,
								description: `Alright, I've removed item **${++id}** from the list. ❌`,
								footer: {
									text: `Do you want to see the full To-Do List again?`,
								},
							},
						});
						return bot.awaitMessage(msg.channel.id, msg.author.id, async message => {
							if (config.yes_strings.includes(message.content.toLowerCase())) {
								try {
									await message.delete();
								} catch (err) {
									// Ignore Error
								}
								showList(true, m);
							}
						});
					}
					case "done":
					case "complete": {
						serverDocument.config.list_data[i].isCompleted = !serverDocument.config.list_data[i].isCompleted;
						let m = await msg.channel.createMessage({
							embed: {
								color: 0x00FF00,
								description: `Alright, I've marked **${++id}** as ${serverDocument.config.list_data[i].isCompleted ? "completed" : "incompleted"}!`,
								footer: {
									text: `Do you want to see the full To-Do List again?`,
								},
							},
						});
						return bot.awaitMessage(msg.channel.id, msg.author.id, async message => {
							if (config.yes_strings.includes(message.content.toLowerCase())) {
								try {
									await message.delete();
								} catch (err) {
									// Ignore error
								}
								showList(true, m);
							}
						});
					}
					default: {
						serverDocument.config.list_data[i].content = action;
						break;
					}
					}
					msg.channel.createMessage({
						embed: {
							color: 0x00FF00,
							description: `Gotcha! 👑`,
						},
					});
				} else {
					msg.channel.createMessage({
						embed: {
							color: 0xFF0000,
							description: serverDocument.config.list_data.length === 0 ? `There are no To-Do Lists to modify..\nUse \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <content>\` to add some.` : `The number must be between 1 and ${serverDocument.config.list_data.length} inclusive..`,
						},
					});
				}
			} else {
				winston.warn(`Invalid parameters "${suffix}" provided for ${commandData.name} command`, { svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id });
				msg.channel.createMessage({
					embed: {
						color: 0xFF0000,
						description: `I..didn't get that..`,
					},
				});
			}
		} else {
			serverDocument.config.list_data.push({ content: suffix });
			let m = await msg.channel.createMessage({
				embed: {
					color: 0x00FF00,
					description: `I've added "${serverDocument.config.list_data[serverDocument.config.list_data.length - 1].content}" to the servers To-Do List! (it has the number **${serverDocument.config.list_data.length}** assigned to it) 🚀`,
					footer: {
						text: `Do you want to see the full To-Do List?`,
					},
				},
			});
			bot.awaitMessage(msg.channel.id, msg.author.id, async message => {
				if (config.yes_strings.includes(message.content.toLowerCase())) {
					try {
						await message.delete();
					} catch (err) {
						// Ignore Error
					}
					showList(true, m);
				}
			});
		}
	} else {
		showList();
	}
};
