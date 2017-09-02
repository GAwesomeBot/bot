const commands = require("./Configurations/commands.js");
const removeMd = require("remove-markdown");
const reload = require("require-reload")(require);
const { Console, Utils, ShardIPC, GetGuild: GG, PostTotalData } = require("./Modules/");
const { RankScoreCalculator: computeRankScores, ModLog, ObjectDefines, MessageOfTheDay } = Utils;
const configJS = require("./Configurations/config.js");
const configJSON = require("./Configurations/config.json");
const auth = require("./Configurations/auth.js");
const database = require("./Database/Driver.js");
const rawEvents = require("./Events/");
const events = {};
const WebServer = require("./Web/WebServer");
const process = require("process");

const privateCommandModules = {};
const commandModules = {};

// Set up a global instance of Winston for this Shard
global.winston = new Console(`Shard ${process.env.SHARD_ID}`);

/* eslint-disable max-len */
// Create a Discord.js Shard Client
const disabledEvents = [
	"MESSAGE_DELETE_BULK",
	"TYPING_START",
];
if (process.argv.includes("--nm") || process.argv.includes("--build")) disabledEvents.push("MESSAGE_CREATE");

const Discord = require("discord.js");
winston.silly("Creating Discord.js client.");
class Client extends Discord.Client {
	constructor (options) {
		super(options);
		// Value set once READY triggers
		this.isReady = false;

		// Store MOTD timers, and cancel accordingly
		this.MOTDTimers = new Discord.Collection();

		// Bot IPC
		winston.silly("Creating ShardIPC instance.");
		this.IPC = new ShardIPC(this, winston, process);

		this.IPC.on("getGuild", msg => {
			let payload = msg;
			if (payload.guild === "*") {
				let result = {};
				this.guilds.forEach((val, key) => {
					result[key] = GG.generate(val, payload.settings);
				});
				this.IPC.send("getGuildRes", { guild: "*", settings: payload.settings, result: result });
			} else {
				let guild = this.guilds.get(payload.guild);
				let val = GG.generate(guild, payload.settings);
				this.IPC.send("getGuildRes", { guild: payload.guild, settings: payload.settings, result: val });
			}
		});

		this.IPC.on("muteMember", async msg => {
			const guild = bot.guilds.get(msg.guild);
			const channel = guild.channels.get(msg.channel);
			const member = guild.members.get(msg.member);

			await this.muteMember(channel, member);
		});

		this.IPC.on("unmuteMember", async msg => {
			const guild = bot.guilds.get(msg.guild);
			const channel = guild.channels.get(msg.channel);
			const member = guild.members.get(msg.member);

			await this.unmuteMember(channel, member);
		});

		this.IPC.on("createMOTD", async msg => {
			try {
				const guild = bot.guilds.get(msg.guild);
				const serverDocument = await db.servers.findOne({ _id: msg.guild }).exec();

				MessageOfTheDay(this, db, guild, serverDocument.config.message_of_the_day);
			} catch (err) {
				winston.warn("Failed to create a MOTD timer for server!", { svrid: msg.guild });
			}
		});
	}

	/**
	 * Gets the command prefix for a server
	 * @param {Discord.Guild} server The guild to search for
	 * @param {Document} serverDocument The database server document for the server
	 * @returns {Promise<?String>} The prefix of the server
	 */
	getCommandPrefix (server, serverDocument) {
		return new Promise(resolve => {
			if (serverDocument.config.command_prefix === "@mention") {
				if (server.me) {
					resolve(`@${server.me.nickname || this.user.username} `);
				} else if (!(server.members instanceof Discord.Collection)) {
					resolve(`@${server.members[bot.user.id].nickname || this.user.username} `);
				} else {
					resolve(`@${server.members.get(bot.user.id).nickname || this.user.username} `);
				}
			} else {
				resolve(serverDocument.config.command_prefix);
			}
		});
	}

	/**
	 * Checks if message contains a command tag, returning the command and suffix
	 * @param {Discord.Message} message The message object from Discord
	 * @param {Document} serverDocument The database server document for the server assigned with the message
	 * @returns {Promise<?Object>} Object containing the command and the suffix (if present)
	 */
	checkCommandTag (message, serverDocument) {
		return new Promise(resolve => {
			message = message.trim();
			let cmdstr;
			if (serverDocument.config.command_prefix === "@mention" && message.startsWith(this.user.toString())) {
				cmdstr = message.substring(this.user.toString() + 1);
			} else if (serverDocument.config.command_prefix === "@mention" && message.startsWith(`<@!${this.user.id}>`)) {
				cmdstr = message.substring(`<@!${this.user.id}>`.length + 1);
			} else if (message.startsWith(serverDocument.config.command_prefix)) {
				cmdstr = message.substring(serverDocument.config.command_prefix.length);
			}
			if (!cmdstr.includes(" ")) {
				resolve({
					command: cmdstr.toLowerCase(),
					suffix: "",
				});
			} else {
				const command = cmdstr.split(" ")[0].toLowerCase();
				const suffix = cmdstr.split(" ")
					.splice(1)
					.join(" ")
					.trim();
				resolve({
					command: command,
					suffix: suffix,
				});
			}
		});
	}

	/**
	 * Gets the name of a user on a server in accordance with config
	 * @param {Discord.Guild} server The guild that contains the member
	 * @param {Document} serverDocument The database server document
	 * @param {Discord.GuildMember} member The guild member to get the name from
	 * @param {Boolean} [ignoreNick=false] If it should ignore nicknames 
	 */
	getName (server, serverDocument, member, ignoreNick = false) {
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
		return cleanName((serverDocument.config.name_display.use_nick && !ignoreNick ? member.nickname ? member.nickname : member.user.username : member.user.username) + (serverDocument.config.name_display.show_discriminator ? `#${member.user.discriminator}` : ""));
	}

	// Bot Command Handlers
	reloadPrivateCommand (command) {
		try {
			privateCommandModules[command] = reload(`./Commands/PM/${command}.js`);
		} catch (err) {
			winston.verbose(`Failed to reload private command "${command}"`, err);
		}
	}

	reloadPublicCommand (command) {
		try {
			commandModules[command] = reload(`./Commands/Public/${command}.js`);
		} catch (err) {
			winston.verbose(`Failed to reload public command "${command}"`, err);
		}
	}

	reloadAllPrivateCommands () {
		let command_keys = Object.keys(privateCommandModules);
		if (!command_keys.length) {
			command_keys = Object.keys(commands.pm);
		}
		command_keys.forEach(cmd => {
			this.reloadPrivateCommand(cmd);
		});
	}

	reloadAllPublicCommands () {
		let command_keys = Object.keys(commandModules);
		if (!command_keys.length) {
			command_keys = Object.keys(commands.public);
		}
		command_keys.forEach(cmd => {
			this.reloadPublicCommand(cmd);
		});
	}

	reloadAllCommands () {
		this.reloadAllPrivateCommands();
		this.reloadAllPublicCommands();
	}

	getPMCommandList () {
		return Object.keys(commands.pm);
	}

	getPublicCommandList () {
		return Object.keys(commands.public);
	}

	getPMCommand (command) {
		return privateCommandModules[command];
	}

	getPublicCommand (command) {
		if (commandModules[command]) {
			return commandModules[command];
		} else {
			for (const publicCommand in commands.public) {
				if (commands.public[publicCommand].aliases && commands.public[publicCommand].aliases.length > 0) {
					if (commands.public[publicCommand].aliases.includes(command.trim())) {
						return commandModules[publicCommand];
					}
				}
			}
		}
	}

	getPublicCommandMetadata (command) {
		if (commands.public[command]) {
			return commands.public[command];
		} else {
			for (const publicCommand in commands.public) {
				if (commands.public[publicCommand].aliases && commands.public[publicCommand].aliases.length > 0) {
					if (commands.public[publicCommand].aliases.includes(command.trim())) {
						return commands.public[publicCommand];
					}
				}
			}
		}
	}

	getPMCommandMetadata (command) {
		return commands.pm[command];
	}

	/**
	 * Finds a member on a server (by username, ID, etc.)
	 * @param {String} string The string to search from
	 * @param {Discord.Guild} server The guild to search the member in
	 * @returns {Promise<?Discord.GuildMember>} The guild member 
	 */
	memberSearch (string, server) {
		return new Promise((resolve, reject) => {
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
	}

	/**
	 * Finds a server (by name, ID, server nick, etc.) for a user
	 * @param {String} string The string to search servers with
	 * @param {Discord.User|Discord.GuildMember} user The user to search the guild for
	 * @param {Document} userDocument The database document for the user
	 * @returns {Promise<?Discord.Guild>} The first guild found with the user
	 */
	serverSearch (string, user, userDocument) {
		return new Promise((resolve, reject) => {
			let foundServer;
			const checkServer = server => server && server.members.has(user.id);

			foundServer = this.guilds.find(server => server.name === string);
			if (checkServer(foundServer)) {
				resolve(foundServer);
			}

			foundServer = this.guilds.find(server => server.name.toLowerCase() === string.toLowerCase());
			if (checkServer(foundServer)) {
				resolve(foundServer);
			}

			foundServer = this.guilds.get(string);
			if (checkServer(foundServer)) {
				resolve(foundServer);
			}

			const servernick = userDocument.server_nicks.id(string.toLowerCase());
			if (servernick) {
				foundServer = this.guilds.get(servernick.server_id);
				if (checkServer(foundServer)) {
					resolve(foundServer);
				}
			}

			reject(new Error(`Couldn't find a server that contains the user using the string "${string}"`));
		});
	}

	/**
	 * Finds a channel (by name or ID) in a server
	 * @param {String} string The string to search the channel for
	 * @param {Discord.Guild} server The guild to search the channel in
	 * @returns {Promise<?Discord.TextChannel>} The text channel from the guild, if found. 
	 */
	channelSearch (string, server) {
		return new Promise((resolve, reject) => {
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
	}

	/**
	 * Finds a role (by name or ID) in a server
	 * @param {String} string The string to search the role for
	 * @param {Discord.Guild} server The guild to search the role in
	 * @returns {Promise<?Discord.Role>} The role, if found.
	 */
	roleSearch (string, server) {
		return new Promise((resolve, reject) => {
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
	}

	/**
	 * Gets the game string from a user
	 * @param {Discord.GuildMember|Discord.User} userOrMember The user or GuildMember to get the game from 
	 * @returns {Promise<?String>} A string containing the game, or an empty string otherwise
	 */
	getGame (userOrMember) {
		return new Promise(resolve => {
			let presence = userOrMember.presence;
			if (presence.game && presence.game !== null && presence.game.name) {
				resolve(presence.game.name);
			} else {
				resolve("");
			}
		});
	}

	/* eslint-disable max-depth */
	/**
	 * Check if a user has leveled up a rank.
	 * @param {Discord.Guild} server The guild containing the member.
	 * @param {Document} serverDocument The database server document for the guild.
	 * @param {Discord.GuildMember} member The GuildMember to check if he leveled up.
	 * @param {Document} memberDocument The database member document from the guild.
	 * @param {Boolean} [override=false] A boolean that represents if the rank score should be calculated with the new scores or not.
	 * @returns {?Promise<?String>} String containing the new role ID for leveling up.
	 */
	async checkRank (server, serverDocument, member, memberDocument, override = false) {
		if (member && member.id !== this.user.id && !member.user.bot && server) {
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
								const findDocument = await db.users.findOrCreate({ _id: member.id }).catch(err => {
									winston.warn(`Failed to find or create user data (for ${member.user.tag}) for points`, { usrid: member.id }, err);
								});
								const userDocument = findDocument.doc;
								if (userDocument) {
									userDocument.points += 100;
									await userDocument.save().catch(usrErr => {
										winston.warn(`Failed to save user data (for ${member.user.tag}) for points`, { usrid: member.id }, usrErr);
									});
								}
							}
							// Assign new rank role if necessary
							if (serverDocument.config.ranks_list[i].role_id) {
								const role = server.roles.get(serverDocument.config.ranks_list[i].role_id);
								if (role) {
									try {
										await member.addRole(role, `Added member to the role for leveling up in ranks.`);
									} catch (err) {
										winston.warn(`Failed to add member "${member.user.tag}" to role "${role.name}" on server "${server}" for rank level up`, {
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
	}

	/* eslint-enable max-depth */
	/**
	 * Handle a spam or filter violation on a server
	 * @param {Discord.Guild} server The guild that should handle this violation
	 * @param {Document} serverDocument The database document for the guild
	 * @param {Discord.TextChannel} channel The channel the violation occured
	 * @param {Discord.GuildMember} member The member that did the violation
	 * @param {Document} userDocument The database user document for the member
	 * @param {Document} memberDocument The database member document from the server document
	 * @param {String} userMessage A string that should be given to the user about the violation
	 * @param {String} adminMessage A string that should be given to the admins about what the user violated
	 * @param {String} strikeMessage The strike message that should appear in the mod logs and the audit logs
	 * @param {String} action What action should be taken.
	 * @param {String} roleID The role ID that the user should get due to the violation
	 */
	async handleViolation (server, serverDocument, channel, member, userDocument, memberDocument, userMessage, adminMessage, strikeMessage, action, roleID) {
		this.logMessage(serverDocument, "info", `Handling a violation by member "${member.user.tag}"; ${adminMessage}`, null, member.id);

		// Deduct 50 GAwesomePoints if necessary
		if (serverDocument.config.commands.points.isEnabled) {
			userDocument.points -= 50;
			await userDocument.save().catch(userErr => {
				winston.warn(`Failed to save user data (for ${member.user.tag}) for points`, { usrid: member.id }, userErr);
			});
		}

		// Add a strike for the user
		memberDocument.strikes.push({
			_id: this.user.id,
			reason: strikeMessage,
		});

		// Assign role if necessary
		if (roleID) {
			const role = server.roles.get(roleID);
			if (role) {
				try {
					await member.addRole(role, `Added the role to the member due to a violation.`);
				} catch (err) {
					winston.warn(`Failed to add member "${member.user.tag}" to role "${role.name}" on server "${server.name}"`, { svrid: server.id, usrid: member.id, roleid: role.id }, err);
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
			await this.messageBotAdmins(server, serverDocument, {
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
					await this.muteMember(channel, member);
					await member.send({
						embed: {
							color: 0xFF0000,
							description: `${userMessage}, so I muted you in the channel.`,
							footer: {
								text: `Contact a moderator to resolve this.`,
							},
						},
					});
					await this.messageBotAdmins(server, serverDocument, {
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
					await this.messageBotAdmins(server, serverDocument, {
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
					await this.messageBotAdmins(server, serverDocument, {
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
					await this.messageBotAdmins(server, serverDocument, {
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
		await serverDocument.save().catch(err => {
			winston.warn(`Failed to save server data for violation`, { svrid: server.id, chid: channel.id, usrid: member.id }, err);
		});
	}

	/**
	 * Check if user has a bot admin role on a server / is a bot admin on the server
	 * @param {Discord.Guild} server The server to check on 
	 * @param {Document} serverDocument The database guild document
	 * @param {Discord.GuildMember} member The member to check the admin level
	 * @returns {Number} The admin level of the user 
	 */
	getUserBotAdmin (server, serverDocument, member) {
		if (!server || !serverDocument || !member) return -1;

		if (server.ownerID === member.id) return 3;

		let adminLevel = 0;
		let roles = member.roles;
		if (!(roles instanceof Array)) roles = roles.array();
		for (const role of roles) {
			const adminDocument = serverDocument.config.admins.id(role.id || role);
			if (adminDocument && adminDocument.level > adminLevel) {
				adminLevel = adminDocument.level;
			}
			if (adminLevel >= 3) break;
		}

		if (adminLevel !== 3 && configJSON.maintainers.includes(member.id)) return 4;

		return adminLevel;
	}

	/**
	 * Message the bot admins for a server
	 * @param {Discord.Guild} server The server that should have its admins messaged
	 * @param {Document} serverDocument The database guild document for the guild.
	 * @param {?Object|String} messageObject A string or a message object.
	 * To send both a content and an embed, you can provide the content in the messageObject.
	 */
	async messageBotAdmins (server, serverDocument, messageObject) {
		server.members.forEach(async member => {
			if (this.getUserBotAdmin(server, serverDocument, member) >= 2 && member.id !== this.user.id && !member.user.bot) {
				try {
					await member.send(messageObject);
				} catch (err) {
					winston.verbose(`bot.messageBotAdmins error at sending, probably blocked the bot / doesn't have messages from non-friends`, err);
				}
			}
		});
	}

	/**
	 * Check if a user is muted on a server, with or without overwrites
	 * @param {Discord.GuildChannel} channel The channel to check this on
	 * @param {Discord.GuildMember} member The member to check this on
	 * @returns {Boolean} A boolean depending if the member is muted.
	 */
	isMuted (channel, member) {
		return !channel.permissionsFor(member).has("SEND_MESSAGES", false);
	}

	/**
	 * Check if a permission overwrite has any permissions related to channels
	 * @param {Discord.PermissionOverwrites} allowedOrDenied The allowed or deny value of a permission overwrite for a member or role
	 * @returns {Boolean} True if it has any of the perms, false if default
	 */ 
	hasOverwritePerms (allowedOrDenied) {
		const PERMS = [
			"CREATE_INSTANT_INVITE",
			"MANAGE_CHANNELS",
			"MANAGE_ROLES",
			"MANAGE_WEBHOOKS",
			"VIEW_CHANNEL",
			"SEND_TTS_MESSAGES",
			"MANAGE_MESSAGES",
			"EMBED_LINKS",
			"ATTACH_FILES",
			"READ_MESSAGE_HISTORY",
			"MENTION_EVERYONE",
			"USE_EXTERNAL_EMOJIS",
			"ADD_REACTIONS",
		];
		const howMany = [];
		for (const perm of PERMS) {
			if (allowedOrDenied.has(perm)) howMany.push(perm);
		}
		if (howMany.length >= 1) {
			return true;
		} else {
			return false;
		}
	}

	/**
 	 * Mutes a member of a server in a channel
 	 * @param {Discord.GuildChannel} channel The channel to mute in
	 * @param {Discord.GuildMember} member The member to mute
	 * @param {String} [reason] Optional reason for the mute
	 */
	async muteMember (channel, member, reason = `Muted ${member.user.tag} in #${channel.name}`) {
		if (!this.isMuted(channel, member) && channel.type === "text") {
			try {
				await channel.overwritePermissions(member.id, {
					SEND_MESSAGES: false,
				}, reason);
			} catch (err) {
				winston.verbose(`Probably missing permissions to mute member in "${channel.guild}".`, err);
			}
		}
	}

	/**
 	 * Unmute a member of a server in a channel
 	 * @param {Discord.GuildChannel} channel The channel to unmute in
	 * @param {Discord.GuildMember} member The member to unmute
	 * @param {String} [reason] Optional reason for the unmute
	 */
	async unmuteMember (channel, member, reason = `Unmuted ${member.user.tag} in #${channel.name}`) {
		if (await this.isMuted(channel, member) && channel.type === "text") {
			const overwrite = channel.permissionOverwrites.get(member.id);
			if (overwrite) {
				const allowedPerms = overwrite.allowed;
				const deniedPerms = overwrite.denied;
				if (this.hasOverwritePerms(allowedPerms) || this.hasOverwritePerms(deniedPerms)) {
					try {
						await channel.overwritePermissions(member.id, {
							SEND_MESSAGES: null,
						}, reason);
					} catch (err) {
						winston.verbose(`Probably missing permissions to unmute member in "${channel.guild}".`, err);
					}
				} else {
					try {
						await overwrite.delete(reason);
					} catch (err) {
						winston.verbose(`Probably missing permissions to unmute member in "${channel.guild}".`, err);
					}
				}
			}
		}
	}

	findQueryUser (query, list) {
		let usr = list.get(query);
		if (!usr) {
			const usernameQuery = query.substring(0, query.lastIndexOf("#") > -1 ? query.lastIndexOf("#") : query.length);
			const discriminatorQuery = query.indexOf("#") > -1 ? query.substring(query.lastIndexOf("#") + 1) : "";
			const usrs = list.filter(a => (a.user || a).username === usernameQuery);
			if (discriminatorQuery) {
				usr = usrs.find(a => (a.user || a).discriminator === discriminatorQuery);
			} else if (usrs.length > 0) {
				usr = usrs[0];
			}
		}
		return usr;
	}

	/**
	 * Gets the avatar for a user by his ID and hash
	 * @param {String} id The user or mebmer ID
	 * @param {String} hash The avatar hash returned from Discord
	 * @param {String} [type="avatars"] Type of avatar to fetch, set to "icons" for servers
	 * @returns {String} A string containing either the Discord URL to the avatar or a static reference to the generic avatar
	 */
	getAvatarURL (id, hash, type = "avatars") {
		return hash ? `${this.options.http.cdn}/${type}/${id}/${hash}.${hash.startsWith("a_") ? "gif" : "png"}?size=2048` : "/static/img/discord-icon.png";
	}

	/**
	 * Logs a message to the serverDocument, for the admin console's logs section
	 * @param {serverDocument} serverDocument The server's mongoose document
	 * @param {String} level The level of severity
	 * @param {String} content The content of the log message
	 * @param {String} [chid] The optional channel ID
	 * @param {String} [usrid] The optional user ID
	 * @returns {Promise<Document>} A promise representing the new serverDocument
	 */
	async logMessage (serverDocument, level, content, chid, usrid) {
		try {
			if (serverDocument && level && content) {
				serverDocument.logs.push({
					level: level,
					content: content,
					channelid: chid ? chid : undefined,
					userid: usrid ? usrid : undefined,
				});
				await serverDocument.save();
			}
		} catch (err) {
			winston.warn(`Failed to save the trees (and logs) for server ${serverDocument._id} (*-*)\n`, err);
		}
		return serverDocument;
	}
}

const bot = new Client({
	shardId: Number(process.env.SHARD_ID),
	shardCount: Number(process.env.SHARD_COUNT),
	fetchAllMembers: true,
	disabledEvents: disabledEvents,
});

ObjectDefines(bot);

let db;
winston.debug("Connecting to MongoDB... ~(˘▾˘~)", { url: configJS.databaseURL });
database.initialize(process.argv.indexOf("--db") > -1 ? process.argv[process.argv.indexOf("--db") + 1] : configJS.databaseURL).catch(err => {
	winston.error(`An error occurred while connecting to MongoDB! Is the database online? >.<\n`, err);
	process.exit(1);
}).then(() => {
	winston.info("Successfully connected to MongoDB!");
	db = database.get();
	winston.debug("Initializing Discord Events.");
	for (const event in rawEvents.events) {
		try {
			let EventFile = require(rawEvents.eventFilePath(event));
			events[event] = new EventFile(bot, db, configJS, configJSON);
		} catch (err) {
			winston.warn(`An error occurred while handling a ${event} Discord event. >.>`, { event: event }, err);
		}
	}
});

process.on("unhandledRejection", reason => {
	winston.error(`An unexpected and unknown error occurred, which we should've been able to handle. Please report to github x.x\n`, reason);
	process.exit(1);
	/*
	 * Just saying, this won't close the process in the future
	 * but if the bot.isReady is true
	 * It'll go in the specified logging channels from configJS.discord
	 */
});

process.on("uncaughtException", err => {
	winston.error(`An unexpected and unknown error occurred, and we failed to handle it. x.x\n`, err);
	/*
	 * Read above 
	 */
	process.exit(1);
});

winston.debug("Logging in to Discord Gateway.");
bot.login(process.env.CLIENT_TOKEN).then(() => {
	winston.info("Successfully connected to Discord!");
	bot.IPC.send("ready", { id: bot.shard.id });
	bot.IPC.listen();
	process.setMaxListeners(0);
	winston.debug("Listening for incoming IPC messages.");
}).catch(err => {
	winston.error("Failed to connect to Discord :/\n", { err: err });
	process.exit(1);
});

bot.once("pre-update", async () => {
	try {
		winston.verbose(`Preparing to update.. Shutting down Discord connections!`);
		await bot.destroy();
	} catch (err) {
		winston.error(`We were unable to destroy the client! This is bad..`);
	}
});

bot.IPC.on("postAllData", async () => {
	await PostTotalData(bot);
});

bot.on("error", error => {
	winston.warn(`The Client WebSocket encountered an error.. ._.`, error);
});

bot.on("guildUnavailable", guild => {
	winston.debug(`${guild} was / is unavailable`, { svrid: guild.id, date: Date.now() });
});

bot.on("guildMembersChunk", (members, guild) => {
	winston.silly(`Received guildMembersChunk for guild "${guild}"`, { svrid: guild.id, members: members.size });
});

/**
 * READY payload received
 */
bot.once("ready", async () => {
	try {
		await winston.debug("Running event READY");
		await events.Ready._handle();
		await winston.debug("Running webserver");
		WebServer(bot, db, auth, configJS, configJSON, winston);
	} catch (err) {
		winston.error(`An unknown and unexpected error occurred with GAB, we tried our best! x.x\n`, err);
		process.exit(1);
	}
});

/**
 * Message Received by the bot
 */
bot.on("message", async msg => {
	if (bot.isReady) {
		winston.silly("Received MESSAGE event from Discord!", { msg: msg });
		try {
			await events.MessageCreate._handle({ msg: msg });
		} catch (err) {
			winston.error(`An unexpected error occurred while handling a MESSAGE event! x.x\n`, err);
		}
	}
});

/**
 * Bot added to a server
 */
bot.on("guildCreate", async guild => {
	if (bot.isReady) {
		winston.silly(`Received GUILD_CREATE event from Discord`, { guild: guild.id });
		try {
			await events.GuildCreate._handle({ guild: guild });
		} catch (err) {
			winston.error(`An unexpected error occurred while handling a GUILD_CREATE event! x.x\n`, err);
		}
	}
});

/**
 * Bot removed from a server
 */
bot.on("guildDelete", async guild => {
	if (bot.isReady) {
		winston.silly(`Received GUILD_DELETE event from Discord`, { guild: guild.id });
		try {
			await events.GuildDelete._handle({ guild: guild });
		} catch (err) {
			winston.error(`An unexpected error occurred while handling a GUILD_DELETE event! x.x\n`, err);
		}
	}
});

/**
 * A member joins a guild
 */
bot.on("guildMemberAdd", async member => {
	if (bot.isReady) {
		winston.silly(`Received GUILD_MEMBER_ADD event from Discord`, { svrid: member.guild.id, usrid: member.id });
		try {
			await events.GuildMemberAdd._handle({ member: member });
		} catch (err) {
			winston.error(`An unexpected error occurred while handling a GUILD_MEMBER_ADD event! x.x\n`, err);
		}
	}
});
