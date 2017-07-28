const commands = require("./Configurations/commands.js");
const removeMd = require("remove-markdown");
const reload = require("require-reload")(require);
const { RankScoreCalculator: computeRankScores, Console } = require("./Modules/");

const configJS 		= require("./Configurations/config.js")
const configJSON 	= require("./Configurations/config.json");

const privateCommandModules = {};
const commandModules = {};

// Set up default Winston Logger File and Global Instance
global.winston = new Console(`Shard ${process.env.SHARD_ID}`);

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
bot.checkRank = async(server, serverDocument, member, memberDocument, override) => {
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
							db.users.findOrCreate({_id: member.id}, (err, userDocument) => {
								if (!err && userDocument) {
									userDocument.points += 100;
									userDocument.save(usrErr => {
										if (usrErr) {
											winston.error(`Failed to save user data (for ${member.user.tag}) for points`, {usrid: member.id}, usrErr);
										}
									});
								} else {
									winston.error(`Failed to find or create user data (for ${member.user.tag}) for points`, {usrid: member.id}, err);
								}
							});
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
										roleid: role.id
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

bot.login(process.env.CLIENT_TOKEN).then(() => {
	winston.info("Successfully connected to Discord!");
}).catch(err => {
	winston.error("Failed to connect to discord :/\n", { err: err });
});
