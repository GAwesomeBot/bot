const { Client: DJSClient, Collection } = require("discord.js");
const ProcessAsPromised = require("process-as-promised");
const removeMd = require("remove-markdown");
const reload = require("require-reload")(require);
const dbl = require("dblposter");
const { readdir } = require("fs-nextra");
const { join } = require("path");

const commands = require("../Configurations/commands.js");
const auth = require("../Configurations/auth.js");
const Timeouts = require("../Modules/Timeouts/index");
const {
	Constants: {
		LoggingLevels,
	},
	Errors: {
		Error: GABError,
	},
	WorkerManager,
	ShardUtil,
	ConversionHandler,
} = require("./");
const { ModLog } = require("../Modules/index");
const {	RankScoreCalculator: computeRankScores } = require("../Modules/Utils/index");

const privateCommandModules = {};
const commandModules = {};
const sharedModules = {};

module.exports = class GABClient extends DJSClient {
	constructor (options) {
		super(options);
		// Value set once READY triggers
		this.isReady = false;

		// Store MOTD timers, and cancel accordingly
		this.MOTDTimers = new Collection();

		this.shardID = process.env.SHARD_ID;

		this.messageListeners = {};

		this.workerManager = new WorkerManager(this);

		// Bot IPC
		this.IPC = new ProcessAsPromised();

		this.shard = new ShardUtil(this);

		this.conversionHandler = new ConversionHandler(this);

		this.extendables = new Collection();
		this.initExtendables();
	}

	/**
	 * Initializes all extendables
	 * @private
	 */
	async initExtendables () {
		const dir = await readdir(join(__dirname, "Extendables"));
		for (const file of dir) {
			if (file.startsWith("_") || !file.endsWith(".js")) continue;
			let extendable = require(`./Extendables/${file}`);
			if (typeof extendable === "function") extendable = new extendable();
			extendable.enable();
			this.extendables.set(extendable.name, extendable);
		}
	}

	/**
	 * Gets the command prefix for a server
	 * @param {Discord.Guild} server The guild to search for
	 * @param {Document} serverDocument The database server document for the server
	 * @returns {Promise<?String>} The prefix of the server
	 */
	getCommandPrefix (server, serverDocument) {
		if (serverDocument.config.command_prefix === "@mention") {
			if (server.me) {
				return `@${server.me.nickname || this.user.username} `;
			} else if (!(server.members instanceof Collection)) {
				return `@${server.members[this.user.id].nickname || this.user.username} `;
			} else {
				return `@${server.members.get(this.user.id).nickname || this.user.username} `;
			}
		} else {
			return serverDocument.config.command_prefix;
		}
	}

	/**
	 * Special await message for PM interaction.
	 * @param {Discord.TextChannel} channel The channel to await a message in
	 * @param {Discord.User} user The user to await the message from
	 * @param {Number} [timeout=60000] The timeout for this await
	 * @param {Function} [filter] The filter to run on the message
	 */
	async awaitPMMessage (channel, user, timeout = 60000, filter = () => true) {
		if (this.shardID === "0") {
			if (!this.messageListeners[channel.id]) this.messageListeners[channel.id] = {};

			const entry = {
				filter,
			};
			entry.promise = new Promise((resolve, reject) => {
				Object.assign(entry, {
					resolve,
					reject,
				});
			});

			this.messageListeners[channel.id][user.id] = entry;

			this.setTimeout(() => {
				if (this.messageListeners[channel.id] && this.messageListeners[channel.id][user.id]) {
					this.deleteAwaitPMMessage(channel, user);
				}
			}, timeout);

			return this.messageListeners[channel.id][user.id].promise;
		} else {
			return this.IPC.send("awaitMessage", { ch: channel.id, usr: user.id, timeout, filter });
		}
	}

	deleteAwaitPMMessage (channel, user) {
		this.messageListeners[channel.id][user.id].reject(new GABError("AWAIT_EXPIRED"));
		delete this.messageListeners[channel.id][user.id];
		if (Object.keys(this.messageListeners[channel.id]).length === 0) delete this.messageListeners[channel.id];
	}

	/**
	 * Checks if message contains a command tag, returning the command and suffix
	 * @param {Discord.Message} message The message object from Discord
	 * @param {Document} serverDocument The database server document for the server assigned with the message
	 * @returns {Promise<?Object>} Object containing the command and the suffix (if present)
	 */
	checkCommandTag (message, serverDocument) {
		message = message.trim();
		let cmdstr;
		let commandObject = {
			command: null,
			suffix: null,
		};
		if (!serverDocument) return Promise.resolve(commandObject);
		if (serverDocument.config.command_prefix === "@mention" && message.startsWith(this.user.toString())) {
			cmdstr = message.substring(this.user.toString().length + 1);
		} else if (serverDocument.config.command_prefix === "@mention" && message.startsWith(`<@!${this.user.id}>`)) {
			cmdstr = message.substring(`<@!${this.user.id}>`.length + 1);
		} else if (message.startsWith(serverDocument.config.command_prefix)) {
			cmdstr = message.substring(serverDocument.config.command_prefix.length);
		}
		if (cmdstr && !cmdstr.includes(" ")) {
			commandObject = {
				command: cmdstr.toLowerCase(),
				suffix: null,
			};
		} else if (cmdstr) {
			let command = cmdstr.split(/\s+/)[0].toLowerCase();
			let suffix = cmdstr.replace(/[\r\n\t]/g, match => {
				const escapes = {
					"\r": "{r}",
					"\n": "{n}",
					"\t": "{t}",
				};
				return escapes[match] || match;
			}).split(/\s+/)
				.splice(1)
				.join(" ")
				.format({ n: "\n", r: "\r", t: "\t" })
				.trim();
			commandObject = {
				command: command,
				suffix: suffix,
			};
		}
		return Promise.resolve(commandObject);
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
	reloadPrivateCommand (command, returnError = false) {
		try {
			privateCommandModules[command] = reload(`../Commands/PM/${command}.js`);
		} catch (err) {
			winston.verbose(`Failed to reload private command "${command}"`, err);
			if (returnError) return err;
		}
	}

	reloadPublicCommand (command, returnError = false) {
		try {
			command = this.getPublicCommandName(command);
			commandModules[command] = reload(`../Commands/Public/${command}.js`);
		} catch (err) {
			winston.verbose(`Failed to reload public command "${command}"`, err);
			if (returnError) return err;
		}
	}

	reloadSharedCommand (command, returnError = false) {
		try {
			command = this.getSharedCommandName(command);
			sharedModules[command] = reload(`../Commands/Shared/${command}.js`);
		} catch (err) {
			winston.verbose(`Failed to reload shared command "${command}"`, err);
			if (returnError) return err;
		}
	}

	reloadAllPrivateCommands () {
		let commandKeys = Object.keys(privateCommandModules);
		if (!commandKeys.length) commandKeys = Object.keys(commands.pm);
		commandKeys.forEach(cmd => this.reloadPrivateCommand(cmd));
	}

	reloadAllPublicCommands () {
		let commandKeys = Object.keys(commandModules);
		if (!commandKeys.length) commandKeys = Object.keys(commands.public);
		commandKeys.forEach(cmd => this.reloadPublicCommand(cmd));
	}

	reloadAllSharedCommands () {
		let commandKeys = Object.keys(sharedModules);
		if (!commandKeys.length) commandKeys = Object.keys(commands.shared);
		commandKeys.forEach(cmd => this.reloadSharedCommand(cmd));
	}

	reloadAllCommands () {
		this.reloadAllPrivateCommands();
		this.reloadAllPublicCommands();
		this.reloadAllSharedCommands();
	}

	getPMCommandList () {
		return Object.keys(commands.pm);
	}

	getPublicCommandList () {
		return Object.keys(commands.public);
	}

	getSharedCommandList () {
		return Object.keys(commands.shared);
	}

	getPMCommand (command) {
		return privateCommandModules[command];
	}

	getPublicCommand (command) {
		if (commandModules[command]) {
			return commandModules[command];
		} else if (command) {
			for (const [key, value] of Object.entries(commands.public)) {
				if (value.aliases && value.aliases.length > 0 && value.aliases.includes(command.trim())) return commandModules[key];
			}
		}
	}

	getSharedCommand (command) {
		if (sharedModules[command]) {
			return sharedModules[command];
		} else if (command) {
			for (const [key, value] of Object.entries(commands.shared)) {
				if (value.aliases && value.aliases.length > 0 && value.aliases.includes(command.trim())) return sharedModules[key];
			}
		}
	}

	getPMCommandMetadata (command) {
		return commands.pm[command];
	}

	getPublicCommandMetadata (command) {
		if (commands.public[command]) {
			return commands.public[command];
		} else {
			for (const [key, value] of Object.entries(commands.public)) {
				if (value.aliases && value.aliases.length > 0 && value.aliases.includes(command.trim())) return commands.public[key];
			}
		}
	}

	getPublicCommandName (command) {
		let cmds = Object.keys(commands.public);
		if (cmds.includes(command)) return command;
		cmds = Object.entries(commands.public);
		for (const [key, value] of cmds) {
			if (value.aliases && value.aliases.length > 0 && value.aliases.includes(command.trim())) return key;
		}
	}

	getSharedCommandMetadata (command) {
		if (commands.shared[command]) {
			return commands.shared[command];
		} else {
			for (const [key, value] of Object.entries(commands.shared)) {
				if (value.aliases && value.aliases.length > 0 && value.aliases.includes(command.trim())) return commands.shared[key];
			}
		}
	}

	getSharedCommandName (command) {
		let cmds = Object.keys(commands.shared);
		if (cmds.includes(command)) return command;
		cmds = Object.entries(commands.shared);
		for (const [key, value] of cmds) {
			if (value.aliases && value.aliases.length > 0 && value.aliases.includes(command.trim())) return key;
		}
	}

	async canRunSharedCommand (command, user) {
		command = this.getSharedCommandName(command);
		if (!(configJSON.sudoMaintainers.includes(user.id) || configJSON.maintainers.includes(user.id))) throw new GABError("UNAUTHORIZED_USER", user);
		let commandData = this.getSharedCommandMetadata(command);
		switch (commandData.perm) {
			case "eval": {
				let value = configJSON.perms.eval;
				switch (value) {
					case 0: return process.env.GAB_HOST === user.id;
					case 1: {
						// Maintainers
						if (configJSON.sudoMaintainers.includes(user.id) || configJSON.maintainers.includes(user.id)) return true;
						return false;
					}
					case 2: {
						// Sudo Maintainers
						if (configJSON.sudoMaintainers.includes(user.id)) return true;
						return false;
					}
				}
				break;
			}
			case "administration":
			case "admin": {
				let value = configJSON.perms.administration;
				switch (value) {
					case 0: return process.env.GAB_HOST === user.id;
					case 1: {
						// Maintainers
						if (configJSON.sudoMaintainers.includes(user.id) || configJSON.maintainers.includes(user.id)) return true;
						return false;
					}
					case 2: {
						// Sudo Maintainers
						if (configJSON.sudoMaintainers.includes(user.id)) return true;
						return false;
					}
				}
				break;
			}
			case "shutdown": {
				let value = configJSON.perms.shutdown;
				switch (value) {
					case 0: return process.env.GAB_HOST === user.id;
					case 1: {
						// Maintainers
						if (configJSON.sudoMaintainers.includes(user.id) || configJSON.maintainers.includes(user.id)) return true;
						return false;
					}
					case 2: {
						// Sudo Maintainers
						if (configJSON.sudoMaintainers.includes(user.id)) return true;
						return false;
					}
				}
				break;
			}
			case "none":
			case "any": {
				return true;
			}
			default: {
				throw new GABError("SHARED_INVALID_MODE", commandData.configJSON, command);
			}
		}
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

			if (string.startsWith("<@!")) {
				foundMember = server.members.get(string.slice(3, -1));
			} else if (string.startsWith("<@")) {
				foundMember = server.members.get(string.slice(2, -1));
			} else if (!isNaN(string) && new RegExp(/^\d+$/).test(string)) {
				foundMember = server.members.get(string);
			} else if (string.startsWith("@")) {
				string = string.slice(1);
			}
			if (string.lastIndexOf("#") === string.length - 5 && !isNaN(string.substring(string.lastIndexOf("#") + 1))) {
				foundMember = server.members.filter(member => member.user.username === string.substring(0, string.lastIndexOf("#") + 1))
					.find(member => member.user.discriminator === string.substring(string.lastIndexOf("#") + 1));
			}
			if (!foundMember) {
				foundMember = server.members.find(member => member.user.username.toLowerCase() === string.toLowerCase());
			}
			if (!foundMember) {
				foundMember = server.members.find(member => member.nickname && member.nickname.toLowerCase() === string.toLowerCase());
			}
			if (foundMember) {
				resolve(foundMember);
			} else {
				reject(new GABError("FAILED_TO_FIND", "member", server, string));
			}
		});
	}

	/**
	 * Relays a command job to a shard that has sufficient data.
	 * @param {String} command The Relay command to execute
	 * @param {Object} filter An object of arguments passed to the "find" function of the Relay command
	 * @param {Object} params An object of arguments passed to the execution function of the Relay command
	 * @returns {Promise<?Boolean>} True when the master replies with a success, false if find failed. If an error occurred, the destination shard is expected to handle according to command logic.
	 */
	relayCommand (command, filter, params) {
		return this.IPC.send("relay", { command: command, findParams: filter, execParams: params });
	}

	/**
	 * Finds a channel (by name or ID) in a server
	 * @param {String} string The string to search the channel for
	 * @param {Discord.Guild} server The guild to search the channel in
	 * @returns {Promise<?Discord.TextChannel>} The text channel from the guild, if found.
	 */
	channelSearch (string, server) {
		return new Promise((resolve, reject) => {
			string = string.toLowerCase().replace(/\s+/g, "-");

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

			reject(new GABError("FAILED_TO_FIND", "channel", server, string));
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

			reject(new GABError("FAILED_TO_FIND", "role", server, string));
		});
	}

	/**
	 * Checks if a member can take actions on another member
	 * @param {Discord.Guild} guild The guild to check the permissions in
	 * @param {Discord.GuildMember} member The message member
	 * @param {Discord.GuildMember} [affectedUser] The affected member
	 * @returns {Object} Object containing the results
	 */
	async canDoActionOnMember (guild, member, affectedUser = null, type = null) {
		if (type) {
			switch (type.toLowerCase()) {
				case "ban": {
					let obj = {
						canClientBan: false,
						memberAboveAffected: false,
					};
					if (affectedUser && affectedUser.bannable) obj.canClientBan = true;
					if (member.roles.highest && affectedUser && affectedUser.roles.highest) {
						if (member.roles.highest.comparePositionTo(affectedUser.roles.highest) > 0) {
							obj.memberAboveAffected = true;
						}
					}
					if (member.id === guild.ownerID) obj.memberAboveAffected = true;
					if (affectedUser === null) {
						obj.canClientBan = guild.me.permissions.has("BAN_MEMBERS");
						obj.memberAboveAffected = true;
					}
					return obj;
				}
			}
		} else {
			throw new GABError("MISSING_ACTION_TYPE");
		}
	}

	/**
	 * Gets the game string from a user
	 * @param {Discord.GuildMember|Discord.User} userOrMember The user or GuildMember to get the game from
	 * @returns {Promise<?String>} A string containing the game, or an empty string otherwise
	 */
	getGame (userOrMember) {
		return new Promise(resolve => {
			let presence = userOrMember.presence;
			if (presence.activity && presence.activity !== null && presence.activity.name) {
				resolve(presence.activity.name);
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
			const currentRankScore = memberDocument.rank_score + (override ? 0 : computeRankScores(memberDocument.messages, memberDocument.voice));
			const ranks = serverDocument.config.ranks_list.sort((a, b) => a.max_score - b.max_score);
			let returnRank;
			ranks.forEach((rank, i) => {
				if (returnRank) return;
				if (currentRankScore <= rank.max_score || i === serverDocument.config.ranks_list.length - 1) {
					if (memberDocument.rank !== rank._id && !override) {
						memberDocument.rank = rank._id;
						if (serverDocument.config.ranks_list) {
							if (serverDocument.config.moderation.isEnabled && serverDocument.config.moderation.status_messages.member_rank_updated_message.isEnabled) {
								// Send member_rank_updated_message if necessary
								if (serverDocument.config.moderation.status_messages.member_rank_updated_message.type === "message") {
									const ch = server.channels.get(serverDocument.config.moderation.status_messages.member_rank_updated_message.channel_id);
									if (ch) {
										const channelDocument = serverDocument.channels.id(ch.id);
										if (!channelDocument || channelDocument.bot_enabled) {
											ch.send({
												content: `${member},`,
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
							// Add 100 GAwesomePoints as reward
							if (serverDocument.config.commands.points.isEnabled && server.members.size > 2) {
								Users.findOne({ _id: member.id }).catch(err => {
									winston.warn(`Failed to find user data (for ${member.user.tag}) for points`, { usrid: member.id }, err);
								}).then(userDocument => {
									if (userDocument) {
										userDocument.points += 100;
										userDocument.save().catch(usrErr => {
											winston.warn(`Failed to save user data (for ${member.user.tag}) for points`, { usrid: member.id }, usrErr);
										});
									}
								});
							}
							// Assign new rank role if necessary
							if (rank.role_id) {
								const role = server.roles.get(rank.role_id);
								if (role) {
									try {
										member.roles.add(role, `Added member to the role for leveling up in ranks.`)
											.catch(err => {
												throw err;
											});
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
					returnRank = rank._id;
				}
			});
			return returnRank;
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
	// TODO: Rewrite this to hell
	async handleViolation (server, serverDocument, channel, member, userDocument, memberDocument, userMessage, adminMessage, strikeMessage, action, roleID) {
		roleID = roleID.id || roleID;
		this.logMessage(serverDocument, LoggingLevels.INFO, `Handling a violation by member "${member.user.tag}"; ${adminMessage}`, null, member.id);

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
					await member.roles.add(role, `Added the role to the member due to a violation.`);
				} catch (err) {
					winston.warn(`Failed to add member "${member.user.tag}" to role "${role.name}" on server "${server.name}"`, { svrid: server.id, usrid: member.id, roleid: role.id }, err);
				}
			}
		}

		const blockMember = async failedAction => {
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
					footer: {
						text: failedAction ? `I was unable to ${failedAction} the member. Please check that I have permissions!` : "",
					},
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
					}).catch(err => {
						winston.silly(`Failed to send DM to a user`, { usrid: member.id }, err.message);
					});
					await this.messageBotAdmins(server, serverDocument, {
						embed: {
							color: 0x3669FA,
							description: `${adminMessage}, so I muted them in the channel.`,
						},
					});
					ModLog.create(server, serverDocument, "Mute", member, null, strikeMessage);
				} catch (err) {
					await blockMember("mute");
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
					}).catch(err => {
						winston.silly(`Failed to send DM to a user`, { usrid: member.id }, err.message);
					});
					await this.messageBotAdmins(server, serverDocument, {
						embed: {
							color: 0x3669FA,
							description: `${adminMessage}, so I kicked them from the server.`,
						},
					});
					ModLog.create(server, serverDocument, "Kick", member, null, strikeMessage);
				} catch (err) {
					await blockMember("kick");
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
					}).catch(err => {
						winston.silly(`Failed to send DM to a user`, { usrid: member.id }, err.message);
					});
					await this.messageBotAdmins(server, serverDocument, {
						embed: {
							color: 0x3669FA,
							description: `${adminMessage}, so I banned them from the server.`,
						},
					});
					ModLog.create(server, serverDocument, "Ban", member, null, strikeMessage);
				} catch (err) {
					await blockMember("ban");
				}
				break;
			}
			case "none":
			default: {
				try {
					await member.send({
						embed: {
							color: 0xFF0000,
							description: `${userMessage}, and the chat moderators have again been notified about this.`,
						},
					}).catch(err => {
						winston.silly(`Failed to send DM to a user`, { usrid: member.id }, err.message);
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
					winston.verbose(`Failed to send DM to admin, probably has me blocked or doesn't accept DMs from non-friends ._.`, err);
				}
			}
		});
	}

	/**
	 * Check if a user is muted on a server, with or without overwrites
	 * @param {Discord.TextChannel} channel The channel to check this on
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
		return howMany.length >= 1;
	}

	/**
 	 * Mutes a member of a server in a channel
 	 * @param {Discord.TextChannel} channel The channel to mute in
	 * @param {Discord.GuildMember} member The member to mute
	 * @param {String} [reason] Optional reason for the mute
	 */
	async muteMember (channel, member, reason = `Muted ${member.user.tag} in #${channel.name}`) {
		if (!this.isMuted(channel, member) && channel.type === "text") {
			try {
				await channel.updateOverwrite(member.id, {
					SEND_MESSAGES: false,
				}, reason);
			} catch (err) {
				winston.verbose(`Probably missing permissions to mute member in "${channel.guild}".`, err);
				// TODO: this.log to the server
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
		if (this.isMuted(channel, member) && channel.type === "text") {
			const overwrite = channel.permissionOverwrites.get(member.id);
			if (overwrite) {
				const allowedPerms = overwrite.allowed;
				const deniedPerms = overwrite.denied;
				if (this.hasOverwritePerms(allowedPerms) || this.hasOverwritePerms(deniedPerms)) {
					try {
						await channel.updateOverwrite(member.id, {
							SEND_MESSAGES: null,
						}, reason);
					} catch (err) {
						winston.verbose(`Probably missing permissions to unmute member in "${channel.guild}".`, err);
						// TODO: this.log to the server
					}
				} else {
					try {
						await overwrite.delete(reason);
					} catch (err) {
						winston.verbose(`Probably missing permissions to unmute member in "${channel.guild}".`, err);
						// TODO: this.log to the server
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
	 * @param {Boolean} [webp=false] If the webp version of an image should be fetched
	 * @returns {String} A string containing either the Discord URL to the avatar or a static reference to the generic avatar
	 */
	getAvatarURL (id, hash, type = "avatars", webp = false) {
		return hash ? `${this.options.http.cdn}/${type}/${id}/${hash}.${hash.startsWith("a_") ? "gif" : webp ? "webp" : "png"}?size=2048` : "/static/img/discord-icon.png";
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
				const logCount = (await Servers.aggregate([{ $match: { _id: serverDocument._id } }, { $project: { logs: { $size: "$logs" } } }]).exec())[0].logs;
				Servers.update({ _id: serverDocument._id }, {
					$push: {
						logs: {
							level: level,
							content: content,
							channelid: chid ? chid : undefined,
							userid: usrid ? usrid : undefined,
						},
					},
				}).exec();
				if (logCount >= 200) {
					await Servers.update({ _id: serverDocument._id }, { $pop: { logs: -1 } }).exec();
				}
			}
		} catch (err) {
			winston.warn(`Failed to save the trees (and logs) for server ${serverDocument._id} (*-*)\n`, err);
		}
		return serverDocument;
	}

	/**
	 * Gets you a langauge translation for a server.
	 * TODO: ?.?: Implement this
	 * @param {Document} serverDocument The document to get the file for
	 */
	getTranslateFile (serverDocument) {
		if (serverDocument.config.localization) {
			switch (serverDocument.config.localization) {
				case "fr": return require("./Languages/fr.js");
				default: return require("./Languages/en_us.js");
			}
		}
	}

	/**
	 * Sets a timeout that will be automatically cancelled if the client is destroyed
	 * @param {Function} fn
	 * @param {Number} delay time to wait before executing (in milliseconds)
	 * @param {String} [key="generic"] The key representing this timer
	 * @param {...*} args Arguments for the function
	 * @returns {Timeout}
	 */
	setTimeout (fn, delay, key = "generic", ...args) {
		const timeout = Timeouts.setTimeout(() => {
			fn(...args);
			this._timeouts.delete(timeout);
		}, delay, key);
		this._timeouts.add(timeout);
		return timeout;
	}

	/**
	 * Clears a timeout
	 * @param {Timeout} timeout Timeout to cancel
	 */
	clearTimeout (timeout) {
		Timeouts.clearTimeout(timeout);
		this._timeouts.delete(timeout);
	}

	/**
	 * Sets an interval that will be automatically cancelled if the client is destroyed
	 * @param {Function} fn Function to execute
	 * @param {Number} delay Time to wait between executions (in milliseconds)
	 * @param {String} [key="generic"] The key representing this interval
	 * @param {...*} args Arguments for the function
	 * @returns {Timeout}
	 */
	setInterval (fn, delay, key = "generic", ...args) {
		const interval = Timeouts.setInterval(fn, delay, key, ...args);
		this._intervals.add(interval);
		return interval;
	}

	/**
	 * Clears an interval
	 * @param {Timeout} interval Interval to cancel
	 */
	clearInterval (interval) {
		Timeouts.clearInterval(interval);
		this._intervals.delete(interval);
	}

	destroy () {
		for (const t of this._timeouts) Timeouts.clearTimeout(t);
		for (const i of this._intervals) Timeouts.clearInterval(i);
		this._timeouts.clear();
		this._intervals.clear();
		return this.manager.destroy();
	}

	async init () {
		if (auth.tokens.discordBotsOrg) {
			const poster = new dbl(auth.tokens.discordBotsOrg, this);
			poster.bind();
		}
		await super.login(process.env.CLIENT_TOKEN);
		await this.workerManager.startWorker();
		return process.env.CLIENT_TOKEN;
	}

	sweepMessages (lifetime = this.options.messageCacheLifetime, commandLifetime = 1800) {
		if (typeof lifetime !== "number" || isNaN(lifetime)) throw new TypeError("The lifetime must be a number.");
		if (lifetime <= 0) {
			this.emit("debug", "Didn't sweep messages - lifetime is unlimited");
			return -1;
		}

		const lifetimeMs = lifetime * 1000;
		const commandLifetimeMs = commandLifetime * 1000;
		const now = Date.now();
		let channels = 0;
		let messages = 0;
		let commandMessages = 0;

		for (const channel of this.channels.values()) {
			if (!channel.messages) continue;
			channels++;

			for (const message of channel.messages.values()) {
				if (message.command && now - (message.editedTimestamp || message.createdTimestamp) > commandLifetimeMs) commandMessages++;
				else if (!message.command && now - (message.editedTimestamp || message.createdTimestamp) > lifetimeMs) messages++;
				else continue;
				channel.messages.delete(message.id);
			}
		}

		this.emit("debug", `Swept ${messages} messages older than ${lifetime} seconds and ${commandMessages} command messages older than ${commandLifetime} seconds in ${channels} text-based channels`);
		return messages;
	}
};
