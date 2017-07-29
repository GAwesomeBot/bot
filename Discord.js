const commands = require("./Configurations/commands.js");
const removeMd = require("remove-markdown");
const reload = require("require-reload")(require);
const { Console, Utils } = require("./Modules/");
const { RankScoreCalculator: computeRankScores, ModLog, ObjectDefines, GlobalDefines } = Utils;
const configJS = require("./Configurations/config.js");
const configJSON = require("./Configurations/config.json");
const database = require("./Database/Driver.js");

const privateCommandModules = {};
const commandModules = {};

// Set up a global instance of Winston for this Shard
global.winston = new Console(`Shard ${process.env.SHARD_ID}`);

ObjectDefines();
GlobalDefines();

/* eslint-disable max-len */
// Create a Discord.js Shard Client
const Discord = require("discord.js");
const bot = new Discord.Client({
	shardId: Number(process.env.SHARD_ID),
	shardCount: Number(process.env.SHARD_COUNT),
	fetchAllMembers: true,
	disabledEvents: [
		"MESSAGE_DELETE_BULK",
		"TYPING_START",
	],
});

// Value set once READY triggers
bot.isReady = false;

let db;
database.initialize(configJS.databaseURL).catch(err => {
	winston.error(`An error occurred while connecting to MongoDB! Is the database online?\n`, err);
	process.exit(1);
}).then(() => {
	winston.info("Successfully connected to MongoDB!");
	db = database.getConnection();
});

// Get the command prefix for a server
bot.getCommandPrefix = (server, serverDocument) => new Promise(resolve => {
	if (serverDocument.config.command_prefix === "@mention") {
		resolve(`@${server.members.get(bot.user.id).nickname || bot.user.username}`);
	} else {
		resolve(serverDocument.config.command_prefix);
	}
});

// Checks if message contains a command tag, returning the command and suffix
bot.checkCommandTag = (message, serverDocument) => new Promise(resolve => {
	message = message.trim();
	let cmdstr;
	if (serverDocument.config.command_prefix === "@mention" && message.startsWith(bot.user.toString())) {
		cmdstr = message.substring(bot.user.toString() + 1);
	} else if (serverDocument.config.command_prefix === "@mention" && message.startsWith(`<@!${bot.user.id}>`)) {
		cmdstr = message.substring(`<@!${bot.user.id}>`.length + 1);
	} else if (message.startsWith(serverDocument.config.command_prefix)) {
		cmdstr = message.substring(serverDocument.config.command_prefix.length);
	}
	if (!cmdstr.includes(" ")) {
		resolve({
			command: cmdstr.toLowerCase(),
			suffix: "",
		});
	} else {
		resolve({
			command: cmdstr.substring(0, cmdstr.indexOf(" ")).toLowerCase(),
			suffix: cmdstr.substring(cmdstr.indexOf(" ") + 1).trim(),
		});
	}
});

// Gets the name of a user on a server in accordance with config
bot.getName = (server, serverDocument, member, ignoreNick = false) => {
	// Cleans a string (strip markdown, prevent @everyone or @here)
	const cleanName = str => {
		str = removeMd(str).replace(/_/g, "\\_")
			.replace(/\*/g, "\\*")
			.replace(/`/g, "\\`");
		return (str.startsWith("everyone") || str.startsWith("here") ? `\u200b${str}` : str)
			.replace(/@everyone/g, "@\u200beveryone")
			.replace(/@here/g, "@\u200bhere")
			.replace(/<@/g, "<@\u200b");
	};
		// eslint-disable-next-line max-len
	return cleanName((serverDocument.config.name_display.use_nick && !ignoreNick ? member.nickname ? member.nickname : member.user.username : member.user.username)	+ serverDocument.config.name_display.show_discriminator ? `#${member.user.discriminator}` : "");
};

// Bot Command Handlers
bot.reloadPrivateCommand = command => {
	try {
		privateCommandModules[command] = reload(`./../Commands/PM/${command}.js`);
	} catch (err) {
		return err;
	}
};

bot.reloadPublicCommand = command => {
	try {
		commandModules[command] = reload(`./../Commands/Public/${command}.js`);
	} catch (err) {
		return err;
	}
};

bot.reloadAllPrivateCommands = () => {
	let command_keys = Object.keys(privateCommandModules);
	if (!command_keys.length) {
		command_keys = Object.keys(commands.pm);
	}
	command_keys.forEach(cmd => {
		bot.reloadPrivateCommand(cmd);
	});
};

bot.reloadAllPublicCommands = () => {
	let command_keys = Object.keys(commandModules);
	if (!command_keys.length) {
		command_keys = Object.keys(commands.public);
	}
	command_keys.forEach(cmd => {
		bot.reloadPublicCommand(cmd);
	});
};

bot.reloadAllCommands = () => {
	bot.reloadAllPrivateCommands();
	bot.reloadAllPublicCommands();
};

bot.getPMCommandList = () => Object.keys(commands.pm);

bot.getPublicCommandList = () => Object.keys(commands.public);

bot.getPMCommand = command =>	privateCommandModules[command];

bot.getPublicCommand = command => commandModules[command];

bot.getPublicCommandMetadata = command =>	commands.public[command];

bot.getPMCommandMetadata = command =>	commands.pm[command];

// Finds a member on a server (by username, ID, etc.)
bot.memberSearch = (string, server) => new Promise((resolve, reject) => {
	let foundMember;
	string = string.trim();

	if (string.startsWith("<@")) {
		foundMember = server.members.get(string.substring(2, string.length - 1));
	} else if (string.startsWith("<@!")) {
		foundMember = server.members.get(string.substring(3, string.length - 1));
	} else if (!isNaN(string) && new RegExp(/^\d+$/).test(string)) {
		foundMember = server.members.get(string);
	} else if (string.startsWith("@")) {
		string = string.slice(1);
	}
	if (string.lastIndexOf("#") === string.length - 5 && !isNaN(string.substring(string.lastIndexOf("#") + 1))) {
		foundMember = server.members.filter(member => member.user.username === string.substring(0, string.lastIndexOf("#") + 1))
			.find(member => member.user.discriminator === string.substring(string.lastIndexOf("#") + 1));
	} else {
		foundMember = server.members.find(member => member.user.username.toLowerCase() === string.toLowerCase());
	}
	if (!foundMember) {
		foundMember = server.members.find(member => member.nickname && member.nickname.toLowerCase() === string.toLowerCase());
	}
	if (foundMember) {
		resolve(foundMember);
	} else {
		reject(new Error(`Couldn't find a member in ${server} using string "${string}"`));
	}
});

// Finds a server (by name, ID, server nick, etc.) for a user
bot.serverSearch = (string, user, userDocument) => new Promise((resolve, reject) => {
	let foundServer;
	const checkServer = server => server && server.members.has(user.id);

	foundServer = bot.guilds.find(server => server.name === string);
	if (checkServer(foundServer)) {
		resolve(foundServer);
	}

	foundServer = bot.guilds.find(server => server.name.toLowerCase() === string.toLowerCase());
	if (checkServer(foundServer)) {
		resolve(foundServer);
	}

	foundServer = bot.guilds.get(string);
	if (checkServer(foundServer)) {
		resolve(foundServer);
	}

	const servernick = userDocument.server_nicks.id(string.toLowerCase());
	if (servernick) {
		foundServer = bot.guilds.get(servernick.server_id);
		if (checkServer(foundServer)) {
			resolve(foundServer);
		}
	}

	reject(new Error(`Couldn't find a server that contains the user using the string "${string}"`));
});

// Finds a channel (by name or ID) in a server
bot.channelSearch = (string, server) => new Promise((resolve, reject) => {
	string = string.toLowerCase().replace(/ /g, "-");

	if (string.startsWith("#") && string.length > 1) {
		string = string.substring(1);
	} else if (string.startsWith("<#") && string.endsWith(">")) {
		string = string.substring(2, string.length - 1);
	}

	let ch = server.channels.get(string);
	if (ch) {
		resolve(ch);
	} else if (!ch) {
		ch = server.channels.find(channel => channel.name === string);
		if (ch) {
			resolve(ch);
		}
	}

	reject(new Error(`Couldn't find any channels in ${server} using the string "${string}"`));
});

// Finds a role (by name or ID) in a server
bot.roleSearch = (string, server) => new Promise((resolve, reject) => {
	if (string.startsWith("<@&") && string.endsWith(">")) {
		string = string.substring(3, string.length - 1);
	}

	let r = server.roles.get(string);
	if (r) {
		resolve(r);
	} else if (!r) {
		r = server.roles.find(role => role.name === string);
		if (r) {
			resolve(r);
		} else {
			r = server.roles.find(role => role.name.toLowerCase() === string.toLowerCase());
			if (r) resolve(r);
		}
	}

	reject(new Error(`Couldn't find any role in ${server} using the string "${string}"`));
});

// Gets the game a member is playing
bot.getGame = member => new Promise((resolve, reject) => {
	let presence = member.presence;
	if (presence.game.name) {
		resolve(presence.game.name);
	}
	reject(new Error(`${member.user} didn't have any game`));
});

// Check if a user has leveled up a rank
/* eslint-disable max-depth, no-await-in-loop */
bot.checkRank = async (server, serverDocument, member, memberDocument, override) => {
	if (member && member.id !== bot.user.id && !member.user.bot && server) {
		const currentRankScore = memberDocument.rank_score + override ? 0 : computeRankScores(memberDocument.messages, memberDocument.voice);
		for (let i = 0; i < serverDocument.config.ranks_list.length; i++) {
			if (currentRankScore <= serverDocument.config.ranks_list[i].max_score || i === serverDocument.config.ranks_list.length - 1) {
				if (memberDocument.rank !== serverDocument.config.ranks_list[i]._id && !override) {
					memberDocument.rank = serverDocument.config.ranks_list[i]._id;
					if (serverDocument.config.ranks_list) {
						if (serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.status_messages.member_rank_updated_message.isEnabled) {
							// Send member_rank_updated_message if necessary
							if (serverDocument.config.moderation.status_messages.member_rank_updated_message.type === "message") {
								const ch = server.channels.get(serverDocument.config.moderation.status_messages.member_rank_updated_message.channel_id);
								if (ch) {
									const channelDocument = serverDocument.channels.id(ch.id);
									if (!channelDocument || channelDocument.bot_enabled) {
										ch.send(`${member}`, {
											embed: {
												color: 0x3669FA,
												description: `Congratulations, you've leveled up to **${memberDocument.rank}**! 🏆`,
											},
										});
									}
								}
							} else if (serverDocument.config.moderation.status_messages.member_rank_updated_message.type === "pm") {
								member.send({
									embed: {
										color: 0x3669FA,
										description: `Congratulations, you've leveled up to **${memberDocument.rank}** on \`${server}\`! 🏆`,
									},
								});
							}
						}
						// Add 100 AwesomePoints as reward
						if (serverDocument.config.commands.points.isEnabled && server.members.size > 2) {
							const userDocument = await db.users.findOrCreate({ _id: member.id }).catch(err => {
								winston.error(`Failed to find or create user data (for ${member.user.tag}) for points`, { usrid: member.id }, err);
							});
							if (userDocument) {
								userDocument.points += 100;
								userDocument.save(usrErr => {
									if (usrErr) {
										winston.error(`Failed to save user data (for ${member.user.tag}) for points`, { usrid: member.id }, usrErr);
									}
								});
							}
						}
						// Assign new rank role if necessary
						if (serverDocument.config.ranks_list[i].role_id) {
							const role = server.roles.get(serverDocument.config.ranks_list[i].role_id);
							if (role) {
								try {
									await member.addRole(role);
								} catch (err) {
									winston.error(`Failed to add member "${member.user.tag}" to role "${role.name}" on server "${server}" for rank level up`, {
										svrid: server.id,
										usrid: member.id,
										roleid: role.id,
									}, err);
								}
							}
						}
					}
				}
				return serverDocument.config.ranks_list[i]._id;
			}
		}
	}
};
/* eslint-enable max-depth */

// Handle a spam or filter violation on a server
bot.handleViolation = async (server, serverDocument, channel, member, userDocument, memberDocument, userMessage, adminMessage, strikeMessage, action, roleID) => {
	// Deduct 50 GAwesomePoints if necessary
	if (serverDocument.config.commands.points.isEnabled) {
		userDocument.points -= 50;
		userDocument.save(userErr => {
			if (userErr) {
				winston.error(`Failed to save user data (for ${member.user.tag}) for points`, { usrid: member.id }, userErr);
			}
		});
	}

	// Add a strike for the user
	memberDocument.strikes.push({
		_id: bot.user.id,
		reason: strikeMessage,
	});

	// Assign role if necessary
	if (roleID) {
		const role = server.roles.get(roleID);
		if (role) {
			try {
				await member.addRole(role);
			} catch (err) {
				winston.error(`Failed to add member "${member.user.tag}" to role "${role.name}" on server "${server.name}"`, { svrid: server.id, usrid: member.id, roleid: role.id }, err);
			}
		}
	}

	const blockMember = async () => {
		if (!serverDocument.config.blocked.includes(member.id)) {
			serverDocument.config.blocked.push(member.id);
		}
		try {
			await member.send({
				embed: {
					color: 0xFF0000,
					description: `${userMessage}, so I blocked you from using me on the server.`,
					footer: {
						text: `Contact a moderator to resolve this.`,
					},
				},
			});
		} catch (err) {
			// Whatever
		}
		await bot.messageBotAdmins(server, serverDocument, {
			embed: {
				color: 0x3669FA,
				description: `${adminMessage}, so I blocked them from using me on the server.`,
			},
		});
		ModLog.create(server, serverDocument, "Block", member, null, strikeMessage);
	};

	switch (action) {
		case "block": {
			await blockMember();
			break;
		}
		case "mute": {
			try {
				await bot.muteMember(channel, member);
				await member.send({
					embed: {
						color: 0xFF0000,
						description: `${userMessage}, so I muted you in the channel.`,
						footer: {
							text: `Contact a moderator to resolve this.`,
						},
					},
				});
				await bot.messageBotAdmins(server, serverDocument, {
					embed: {
						color: 0x3669FA,
						description: `${adminMessage}, so I muted them in the channel.`,
					},
				});
				ModLog.create(server, serverDocument, "Mute", member, null, strikeMessage);
			} catch (err) {
				await blockMember();
			}
			break;
		}
		case "kick": {
			try {
				await member.kick(`${adminMessage}, so I kicked them from the server.`);
				await member.send({
					embed: {
						color: 0xFF0000,
						description: `${userMessage}, so I kicked you from the server. Goodbye.`,
					},
				});
				await bot.messageBotAdmins(server, serverDocument, {
					color: 0x3669FA,
					description: `${adminMessage}, so I kicked them from the server.`,
				});
				ModLog.create(server, serverDocument, "Kick", member, null, strikeMessage);
			} catch (err) {
				await blockMember();
			}
			break;
		}
		case "ban": {
			try {
				await member.ban({
					days: 0,
					reason: `${adminMessage}, so I banned them from the server.`,
				});
				await member.send({
					embed: {
						color: 0xFF0000,
						description: `${userMessage}, so I banned you from the server. Goodbye.`,
					},
				});
				await bot.messageBotAdmins(server, serverDocument, {
					embed: {
						color: 0x3669FA,
						description: `${adminMessage}, so I banned them from the server.`,
					},
				});
				ModLog.create(server, serverDocument, "Ban", member, null, strikeMessage);
			} catch (err) {
				await blockMember();
			}
			break;
		}
		case "none":
		default: {
			try {
				await member.send({
					embed: {
						color: 0xFF0000,
						description: `${userMessage}, and the chat moderator have again been notified about this.`,
					},
				});
				await bot.messageBotAdmins(server, serverDocument, {
					embed: {
						color: 0x3669FA,
						description: `${adminMessage}, but I didn't do anything about it.`,
					},
				});
				ModLog.create(server, serverDocument, "Warning", member, null, strikeMessage);
			} catch (err) {
				// Whatever
			}
			break;
		}
	}

	// Save serverDocument
	serverDocument.save(err => {
		if (err) {
			winston.warn(`Failed to save server data for violation`, { svrid: server.id, chid: channel.id, usrid: member.id }, err);
		}
	});
};

// Check if user has a bot admin role on a server / is a bot admin on the server
bot.getUserBotAdmin = (server, serverDocument, member) => {
	if (!server || !serverDocument || !member) return -1;

	if (configJSON.maintainers.includes(member.id)) return 4;

	if (server.ownerID === member.id) return 3;

	let adminLevel = 0;
	let roles = member.roles.array();
	for (const role of roles) {
		const adminDocument = serverDocument.config.admins.id(role.id);
		if (adminDocument && adminDocument.level > adminLevel) {
			adminLevel = adminDocument.level;
		}
		if (adminLevel >= 3) break;
	}
	return adminLevel;
};

// Message the bot admins for a server
bot.messageBotAdmins = (server, serverDocument, messageObject) => {
	let content = "";
	if (messageObject.content) {
		content = messageObject.content;
		delete messageObject.content;
	}
	server.members.forEach(async member => {
		if (bot.getUserBotAdmin(server, serverDocument, member) >= 2 && member.id !== bot.user.id && !member.user.bot) {
			try {
				await member.send(content, messageObject);
			} catch (err) {
				winston.verbose(`bot.messageBotAdmins error at sending, probably blocked the bot / doesn't have messages from non-friends`, err);
			}
		}
	});
};

// Check if a user is muted on a server, with or without overwrites
bot.isMuted = (channel, member) => !channel.permissionsFor(member).has("SEND_MESSAGES");

/**
 * Mutes a member of a server in a channel
 * Doesn't account for READ_MESSAGES
 * @param channel The channel to unmute
 * @param member The member to unmute
 */
bot.muteMember = async (channel, member) => {
	if (bot.isMuted(channel, member) && channel.type === 0) {
		try {
			await channel.overwritePermissions(member.id, {
				SEND_MESSAGES: false,
			});
		} catch (err) {
			winston.verbose(`Probably missing permissions to mute member in "${channel.guild}".`, err);
		}
	}
};

/**
 * Unmute a member of a server in a channel
 * Doesn't account for READ_MESSAGES
 * @param channel The channel to unmute
 * @param member The member to unmute
 */
bot.unmuteMember = async (channel, member) => {
	if (bot.isMuted(channel, member) && channel.type === 0) {
		try {
			await channel.overwritePermissions(member.id, {
				SEND_MESSAGES: true,
			});
		} catch (err) {
			winston.verbose(`Probably missing permissions to unmute member in "${channel.guild}".`, err);
		}
	}
};

const shard = bot.shard;

bot.login(process.env.CLIENT_TOKEN).then(() => {
	winston.info("Successfully connected to Discord!");
	shard.send("Hey mom");
}).catch(err => {
	winston.error("Failed to connect to discord :/\n", { err: err });
});
