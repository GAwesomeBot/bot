const commands = require("./../Configuration/commands.json");
const computeRankScore = require("./../Modules/RankScoreCalculator.js");
const removeMd = require("remove-markdown");
const reload = require("require-reload")(require);
const ModLog = require("./../Modules/ModerationLogging.js");

const privateCommandModules = {};
const commandModules = {};

module.exports = (db, auth, config) => {
	// Create a new Eris bot client
	const eris = require("eris");
	process.setMaxListeners(0);
	const bot = new eris.Client(auth.platform.login_token, {
		disableEvents: {
			MESSAGE_DELETE_BULK: true,
			TYPING_START: true
		},
		getAllUsers: true,
		maxShards: config.shard_count || 1
	});
	bot.isReady = false;

	// Sequentially send an array
	bot.sendArray = (ch, arr, i, options, callback) => {
		if(i==null) {
			i = 0;
		}
		if(i>=arr.length) {
			if(callback) {
				callback();
			}
		} else {
			let messageContent = arr[i];
			if(options) {
				messageContent = options;
				messageContent.content = arr[i];
			}
			ch.createMessage(messageContent).then(() => {
				bot.sendArray(ch, arr, ++i, options, callback);
			});
		}
	};

	// Setup a message listener for a user in a channel ()
	bot.messageListeners = {};
	bot.awaitMessage = (chid, usrid, filter, callback) => {
		if(!callback) {
			callback = filter;
			filter = () => {
				return true;
			};
		}
		if(!bot.messageListeners[chid]) {
			bot.messageListeners[chid] = {};
		}
		bot.messageListeners[chid][usrid] = {
			callback,
			filter
		};
		setTimeout(() => {
			if(bot.messageListeners[chid] && bot.messageListeners[chid][usrid]) {
				delete bot.messageListeners[chid][usrid];
				if(Object.keys(bot.messageListeners[chid])==0) {
					delete bot.messageListeners[chid];
				}
			}
		}, 60000);
	};
	bot.removeMessageListener = (chid, usrid) => {
		delete bot.messageListeners[chid][usrid];
		if(Object.keys(bot.messageListeners[chid])==0) {
			delete bot.messageListeners[chid];
		}
	};

	// Get the command prefix for a server
	bot.getCommandPrefix = (svr, serverDocument) => {
		return serverDocument.config.command_prefix=="@mention" ? (`@${svr.members.get(bot.user.id).nick || bot.user.username} `) : serverDocument.config.command_prefix;
	};

	// Checks if message contains a command tag, returning the command and post-text
	bot.checkCommandTag = (message, serverDocument) => {
		message = message.trim();
		let cmdstr;
		if(serverDocument.config.command_prefix=="@mention" && message.indexOf(bot.user.mention)==0) {
			cmdstr = message.substring(bot.user.mention.length+1);
		} else if(serverDocument.config.command_prefix=="@mention" && message.indexOf(`<@!${bot.user.id}>`)==0) {
			cmdstr = message.substring((`<@!${bot.user.id}>`).length+1);
		} else if(message.indexOf(serverDocument.config.command_prefix)==0) {
			cmdstr = message.substring(serverDocument.config.command_prefix.length);
		} else {
			return;
		}
		if(cmdstr.indexOf(" ")==-1) {
			return {
				command: cmdstr.toLowerCase(),
				suffix: ""
			};
		} else {
			return {
				command: cmdstr.substring(0, cmdstr.indexOf(" ")).toLowerCase(),
				suffix: cmdstr.substring(cmdstr.indexOf(" ")+1).trim()
			};
		}
	};

	// Gets the name of a user on a server in accordance with config
	bot.getName = (svr, serverDocument, member, ignoreNick) => {
		// Cleans a string (strip markdown, prevent @everyone or @here)
		const cleanName = str => {
			str = removeMd(str).replaceAll("_", "\\_").replaceAll("*", "\\*").replaceAll("`", "\\`");
			return ((str.indexOf("everyone")==0 || str.indexOf("here")==0) ? (`\u200b${str}`) : str).replaceAll("@everyone", "@\u200beveryone").replaceAll("@here", "@\u200bhere").replaceAll("<@", "<@\u200b");
		};

		return cleanName(((serverDocument.config.name_display.use_nick && !ignoreNick) ? (member.nick || member.user.username) : member.user.username) + (serverDocument.config.name_display.show_discriminator ? (`#${member.user.discriminator}`) : ""));
	};

	// bot command handler
	bot.reloadPrivateCommand = command => {
		try {
			privateCommandModules[command] = reload(`./../Commands/PM/${command}.js`);
			return;
		}
		catch(err) {
			return err;
		}
	};

	bot.reloadPublicCommand = command => {
		try {
			commandModules[command] = reload(`./../Commands/Public/${command}.js`);
			return;
		}
		catch(err) {
			return err;
		}
	};

	bot.reloadAllPrivateCommands = () => {
		let command_keys = Object.keys(privateCommandModules);
		if(!command_keys.length) {
			command_keys = Object.keys(commands.pm);
			command_keys.forEach(command_key => {
				bot.reloadPrivateCommand(command_key);
			});
		}
	};

	bot.reloadAllPublicCommands = () => {
		let command_keys = Object.keys(commandModules);
		if(!command_keys.length) {
			command_keys = Object.keys(commands.public);
			command_keys.forEach(command => {
				bot.reloadPublicCommand(command);
			});
		}
	};

	bot.reloadAllCommands = () => {
		bot.reloadAllPrivateCommands();
		bot.reloadAllPublicCommands();
	};

	bot.getPMCommandList = () => {
		return Object.keys(commands.pm);
	};

	bot.getPublicCommandList = () => {
		return Object.keys(commands.public);
	};

	bot.getPMCommand = command => {
		return privateCommandModules[command];
	};

	bot.getPublicCommand = command => {
		return commandModules[command];
	};

	bot.getPublicCommandMetadata = command => {
		return commands.public[command];
	};

	bot.getPMCommandMetadata = command => {
		return commands.pm[command];
	};

	// Finds a user on a server (by username, ID, etc.)
	bot.memberSearch = (str, svr) => {
		let member;
		str = str.trim();
		if(str.indexOf("<@!")==0) {
			member = svr.members.get(str.substring(3, str.length-1));
		} else if(str.indexOf("<@")==0) {
			member = svr.members.get(str.substring(2, str.length-1));
		} else if(!isNaN(str)) {
			member = svr.members.get(str);
		} else {
			if(str.indexOf("@")==0) {
				str = str.slice(1);
			}
			if(str.lastIndexOf("#")==str.length-5 && !isNaN(str.substring(str.lastIndexOf("#")+1))) {
				member = svr.members.filter(member => {
					return member.user.username==str.substring(0, str.lastIndexOf("#"));
				}).find(member => {
					return member.user.discriminator==str.substring(str.lastIndexOf("#")+1);
				});
			} else {
				member = svr.members.find(member => {
					return member.user.username==str;
				});
			}
			if(!member) {
				member = svr.members.find(member => {
					return member.nick && member.nick==str;
				});
			}
		}
		return member;
	};

	// Finds a server (by name, ID, etc.) for a user
	bot.serverSearch = (str, usr, userDocument) => {
		let svr;
		const checkServer = svr => {
			return svr && svr.members.has(usr.id);
		};

		svr = bot.guilds.find(svr => {
			return svr.name==str;
		});
		if(checkServer(svr)) {
			return svr;
		}

		svr = bot.guilds.get(str);
		if(checkServer(svr)) {
			return svr;
		}

		svr = bot.guilds.find(svr => {
			return str.toLowerCase()==svr.name.toLowerCase();
		});
		if(checkServer(svr)) {
			return svr;
		}

		const svrnick = userDocument.server_nicks.id(str.toLowerCase());
		if(svrnick) {
			svr = bot.guilds.get(svrnick.server_id);
			if(checkServer(svr)) {
				return svr;
			}
		}
		return;
	};

	// Finds a channel (by name or ID) in a server
	bot.channelSearch = (str, svr) => {
		str = str.toLowerCase().replaceAll(" ", "-");
		if(str.startsWith("#") && str.length>1) {
			str = str.slice(1);
		} else if(str.startsWith("<#")) {
			str = str.slice(2).slice(0, -1);
		}
		let ch = svr.channels.get(str);
		if(!ch) {
			ch = svr.channels.find(channel => {
				return channel.name==str;
			});
		}
		return ch;
	};

	// Finds a member (by name or ID) in a server
	bot.roleSearch = (str, svr) => {
		if(str.startsWith("<@&")) {
			str = str.slice(3).slice(0, -1);
		}
		let role = svr.roles.get(str);
		if(!role) {
			role = svr.roles.find(r => {
				return r.name==str;
			});
			if(!role) {
				role = svr.roles.find(r => {
					return r.name.toLowerCase()==str.toLowerCase();
				});
			}
		}
		return role;
	};

	// Gets a sample member object for a user to use for status info (since status is per-shard)
	bot.getFirstMember = usr => {
		return bot.guilds.find(svr => {
			return svr.members.has(usr.id);
		}).members.get(usr.id);
	};

	// Gets the game a member is playing
	bot.getGame = member => {
		if(typeof(member.game)=="string") {
			return member.game;
		} else if(member.game && member.game.name) {
			return member.game.name;
		}
		return "";
	};

	// Check if a user has leveled up a rank
	bot.checkRank = (winston, svr, serverDocument, member, memberDocument, override) => {
		if(member && member.id!=bot.user.id && !member.user.bot && svr) {
			const currentRankscore = memberDocument.rank_score + (override ? 0 : computeRankScore(memberDocument.messages, memberDocument.voice));
			for(let i=0; i<serverDocument.config.ranks_list.length; i++) {
				if(currentRankscore<=serverDocument.config.ranks_list[i].max_score || i==serverDocument.config.ranks_list.length-1) {
					if(memberDocument.rank!=serverDocument.config.ranks_list[i]._id && !override) {
						memberDocument.rank = serverDocument.config.ranks_list[i]._id;
						if(serverDocument.config.ranks_list) {
							if(serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.status_messages.member_rank_updated_message.isEnabled) {
								// Send member_rank_updated_message if necessary
								if(serverDocument.config.moderation.status_messages.member_rank_updated_message.type=="message") {
									const ch = svr.channels.get(serverDocument.config.moderation.status_messages.member_rank_updated_message.channel_id);
									if(ch) {
										const channelDocument = serverDocument.channels.id(ch.id);
										if(!channelDocument || channelDocument.bot_enabled) {
											ch.createMessage(`Congratulations ${member.mention}, you've leveled up to **${memberDocument.rank}** 🏆`);
										}
									}
								} else if(serverDocument.config.moderation.status_messages.member_rank_updated_message.type=="pm") {
									member.user.getDMChannel().then(ch => {
										ch.createMessage(`Congratulations, you've leveled up to **${memberDocument.rank}** on ${svr.name} 🏆`
											);
									});
								}
							}

							// Add 100 AwesomePoints as reward
							if(serverDocument.config.commands.points.isEnabled && svr.members.size>2) {
								db.users.findOrCreate({_id: member.id}, (err, userDocument) => {
									if(!err && userDocument) {
										userDocument.points += 100;
										userDocument.save(err => {
											if(err) {
												winston.error("Failed to save user data for points", {usrid: member.id}, err);
											}
										});
									} else {
										winston.error("Failed to find or create user data for points", {usrid: member.id}, err);
									}
								});
							}

							// Assign new rank role if necessary
							if(serverDocument.config.ranks_list[i].role_id) {
								const role = svr.roles.get(serverDocument.config.ranks_list[i].role_id);
								if(role) {
									member.roles.push(role.id);
									member.edit({
										roles: member.roles
									}).then().catch(err => {
										winston.error(`Failed to add member '${member.user.username} to role '${role.name}' on server '${svr.name}' for rank level up`, {svrid: svr.id, usrid: member.id, roleid: role.id}, err);
									});
								}
							}
						}
					}
					return serverDocument.config.ranks_list[i]._id;
				}
			}
		}
		return "";
	};

	// Handle a spam or filter violation on a server
	bot.handleViolation = (winston, svr, serverDocument, ch, member, userDocument, memberDocument, userMessage, adminMessage, strikeMessage, action, roleid) => {
		// Deduct 50 AwesomePoints if necessary
		if(serverDocument.config.commands.points.isEnabled) {
			userDocument.points -= 50;
			userDocument.save(err => {
				if(err) {
					winston.error("Failed to save user data for points", {usrid: member.id}, err);
				}
			});
		}

		// Add a strike for the user
		memberDocument.strikes.push({
			_id: bot.user.id,
			reason: strikeMessage
		});

		// Assign role if necessary
		if(roleid) {
			const role = svr.roles.get(roleid);
			if(role) {
				member.roles.push(role.id);
				member.edit({
					roles: member.roles
				}).then().catch(err => {
					winston.error(`Failed to add member '${member.user.username}'' to role '${role.name}'' on server '${svr.name}'`, {svrid: svr.id, usrid: member.id, roleid: role.id}, err);
				});
			}
		}

		// Block member
		const blockMember = () => {
			if(serverDocument.config.blocked.indexOf(member.id)==-1) {
				serverDocument.config.blocked.push(member.id);
			}
			member.user.getDMChannel().then(ch => {
				ch.createMessage(`${userMessage}, so I blocked you from using me on the server. Contact a moderator to resolve this.`);
			});
			bot.messageBotAdmins(svr, serverDocument, `${adminMessage}, so I blocked them from using me on the server.`);
			ModLog.create(svr, serverDocument, "Block", member, null, strikeMessage);
		};

		// Perform action, message admins, and message user
		switch(action) {
			case "block":
				blockMember();
				break;
			case "mute":
				bot.muteMember(ch, member, err => {
					if(err) {
						blockMember();
					} else {
						member.user.getDMChannel().then(ch => {
							ch.createMessage(`${userMessage}, so I muted you in the channel. Contact a moderator to resolve this.`);
						});
						bot.messageBotAdmins(svr, serverDocument, `${adminMessage}, so I muted them in the channel.`);
						ModLog.create(svr, serverDocument, "Mute", member, null, strikeMessage);
					}
				});
				break;
			case "kick":
				member.kick().then(() => {
					member.user.getDMChannel().then(ch => {
						ch.createMessage(`${userMessage}, so I kicked you from the server. Goodbye.`);
					});
					bot.messageBotAdmins(svr, serverDocument, `${adminMessage}, so I kicked them from the server.`);
					ModLog.create(svr, serverDocument, "Kick", member, null, strikeMessage);
				}).catch(blockMember);
				break;
			case "ban":
				member.ban().then(() => {
					member.user.getDMChannel().then(ch => {
						ch.createMessage(`${userMessage}, so I banned you from the server. Goodbye.`);
					});
					bot.messageBotAdmins(svr, serverDocument, `${adminMessage}, so I banned them from the server.`);
					ModLog.create(svr, serverDocument, "Ban", member, null, strikeMessage);
				}).catch(blockMember);
				break;
			case "none":
			default:
				member.user.getDMChannel().then(ch => {
					ch.createMessage(`${userMessage}, and the chat moderators have again been notified about this.`);
				});
				bot.messageBotAdmins(svr, serverDocument, `${adminMessage}, but I didn't do anything about it.`);
				ModLog.create(svr, serverDocument, "Warning", member, null, strikeMessage);
				break;
		}

		// Save serverDocument
		serverDocument.save(err => {
			if(err) {
				winston.error("Failed to save server data for violation", {svrid: svr.id, chid: ch.id, usrid: member.id}, err);
			}
		});
	};

	// Check if user has a bot admin role on a server
	bot.getUserBotAdmin = (svr, serverDocument, member) => {
		if(!svr || !serverDocument || !member) {
			return -1;
		}
		if(config.maintainers.indexOf(member.id)>-1) {
			return 4;
		}
		if(svr.ownerID==member.id) {
			return 3;
		}
		let adminLevel = 0;
		for(let i=0; i<member.roles.length; i++) {
			const adminDocument = serverDocument.config.admins.id(member.roles[i]);
			if(adminDocument && adminDocument.level>adminLevel) {
				adminLevel = adminDocument.level;
			}
			if(adminLevel>=3) {
				break;
			}
		}
		return adminLevel;
	};

	// Message the bot admins for a server
	bot.messageBotAdmins = (svr, serverDocument, message) => {
		svr.members.forEach(member => {
			if(bot.getUserBotAdmin(svr, serverDocument, member)>=2 && member.id!=bot.user.id && !member.user.bot) {
				member.user.getDMChannel().then(ch => {
					ch.createMessage(message);
				});
			}
		});
	};

	// Check if a user is muted on a server
	bot.isMuted = (ch, member) => {
		return !ch.permissionsOf(member.id).has("sendMessages") || (ch.permissionOverwrites.has(member.id) && !ch.permissionOverwrites.get(member.id).has("sendMessages"));
	};

	// Mute a member of a server in a channel
	bot.muteMember = (ch, member, callback) => {
		if(!bot.isMuted(ch, member) && ch.type==0) {
			ch.editPermission(member.id, null, 2048, "member").then(callback);
		}
	};

	// Unmute a member of a server in a channel
	bot.unmuteMember = (ch, member, callback) => {
		if(bot.isMuted(ch, member) && ch.type==0) {
			ch.editPermission(member.id, 2048, null, "member").then(callback);
		}
	};

	return bot;
};

Object.assign(String.prototype, {
	replaceAll(target, replacement) {
		return this.split(target).join(replacement);
	}
});

Object.assign(Array.prototype, {
	random() {
		return this[Math.floor(Math.random() * this.length)];
	}
});
