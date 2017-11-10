const UserStore = require("../DataStores/ExtensionUserStore");
const User = require("./User");
const Member = require("./GuildMember");
let bot, db, server, serverDocument;

/**
 * Sandboxed Discord.js client
 */
module.exports = class Client {
	/**
	 * @param {Discord.Client} rawBot The raw bot instance
	 * @param {Database} rawDB The database connection
	 * @param {Discord.Guild} rawServer The raw guild this client should be instantiated for
	 * @param {Document} rawServerDocument The server document for the guild
	 */
	constructor (rawBot, rawDB, rawServer, rawServerDocument) {
		/**
		 * A dummy channel object
		 * @type {Object}
		 */
		this.channels = {
			/**
			 * Returns the amount of channels the bot knows about
			 * @type {Number}
			 */
			get size () {
				return rawBot.channels.size;
			},
		};
		/**
		 * A dummy emoji object
		 * @type {Object}
		 */
		this.emojis = {
			/**
			 * Returns the amount of emojis the bot knows about
			 * @type {Number}
			 */
			get size () {
				return rawBot.emojis.size;
			},
		};
		/**
		 * A dummy guild object
		 * @type {Object}
		 */
		this.guilds = {
			/**
			 * Returns the amount of guilds the bot knows about
			 * @type {Number}
			 */
			get size () {
				return rawBot.guilds.size;
			},
		};
		this.ping = rawBot.ping;
		this.uptime = rawBot.uptime;
		/**
		 * The bot user, sandboxed
		 * @type {User}
		 */
		this.user = new User(rawBot.user);
		/**
		 * A UserStore of the bot
		 * Contains the `size` of the users the bot knows, and a fetch option
		 * if you want to get more info from a user ID.
		 * @type {UserStore}
		 */
		this.users = new UserStore(rawBot);
		bot = rawBot;
		db = rawDB;
		server = rawServer;
		serverDocument = rawServerDocument;
	}

	/**
	 * Data that can be resolved to a Member. This can be:
	 * * An extension member
	 * * A Snowflake
	 * @typedef {Discord.Snowflake|GuildMember} MemberResolvable
	 */

	/**
	 * Data that can be resolved to a Channel. This can be:
	 * * An extension channel
	 * * A Snowflake
	 * @typedef {Discord.Snowflake|GuildChannel} ChannelResolvable
	 */

	/**
	 * Options provided when sending or editing a message
	 * @typedef {Object} MessageOptions
	 * @property {Boolean} [tts=false] Whether or not the message should be spoken aloud 
	 * @property {String} [content=''] The content for the message
	 * @property {Embed|Object} [embed] An embed for the message
	 * @property {Boolean} [disableEveryone=true] Whether or not @everyone and @here
	 * should be replaced with plain-text
	 * @property {String|Boolean} [code] Language for optional codeblock formatting to apply
	 * @property {Boolean|SplitOptions} [split=false] Whether or not the message should be split into multiple messages if
   * it exceeds the character limit. If an object is provided, these are the options for splitting the message
	 * @property {UserResolvable} [reply] User to reply to (prefixes the message with a mention, except in DMs)
	 */

	/**
   * Options for splitting a message.
   * @typedef {Object} SplitOptions
   * @property {Number} [maxLength=1950] Maximum character length per message piece
   * @property {String} [char='\n'] Character to split the message with
   * @property {String} [prepend=''] Text to prepend to every piece except the first
   * @property {String} [append=''] Text to append to every piece except the last
   */

	/**
   * Data that can resolve to a string. This can be:
	 * * An array, joined using `\n`
	 * * A string
   * @typedef {String|String[]} StringResolvable
   */

	/**
	 * Sends a message to all bot admins on the server
	 * @param {StringResolvable|MessageOptions} messageObject The message content or object
	 */
	messageBotAdmins (messageObject) {
		bot.messageBotAdmins(server, serverDocument, messageObject);
	}

	/**
	 * Tells you if a user is muted in a channel
	 * @param {ChannelResolvable} channelOrChannelID The channel to check if the member is muted, or a channel ID
	 * @param {MemberResolvable} memberOrMemberID The member to check if muted, or its ID
	 * @returns {Promise<Boolean>} If the user is muted or not
	 */
	async isMuted (channelOrChannelID, memberOrMemberID) {
		channelOrChannelID = channelOrChannelID.id || channelOrChannelID;
		memberOrMemberID = memberOrMemberID.id || memberOrMemberID;
		try {
			let theChannel = server.channels.get(channelOrChannelID);
			let theMember = server.members.get(memberOrMemberID);
			return bot.isMuted(theChannel, theMember);
		} catch (err) {
			throw err;
		}
	}

	/**
	 * Mutes a member
	 * @param {ChannelResolvable} channelOrChannelID The channel to mute the member in, or a channel ID
	 * @param {MemberResolvable} memberOrMemberID The member to mute, or its ID
	 * @param {String} [reason=''] Optional reason for the mute
	 */
	async muteMember (channelOrChannelID, memberOrMemberID, reason = "") {
		channelOrChannelID = channelOrChannelID.id || channelOrChannelID;
		memberOrMemberID = memberOrMemberID.id || memberOrMemberID;
		try {
			let theChannel = server.channels.get(channelOrChannelID);
			let theMember = server.members.get(memberOrMemberID);
			bot.muteMember(theChannel, theMember, reason);
		} catch (err) {
			throw err;
		}
	}

	/**
	 * Unmutes a member
	 * @param {ChannelResolvable} channelOrChannelID The channel to unmute the member in, or a channel ID
	 * @param {MemberResolvable} memberOrMemberID The member to mute, or its ID
	 * @param {String} [reason=''] Optional reason for the mute
	 */
	async unmuteMember (channelOrChannelID, memberOrMemberID, reason = "") {
		channelOrChannelID = channelOrChannelID.id || channelOrChannelID;
		memberOrMemberID = memberOrMemberID.id || memberOrMemberID;
		try {
			let theChannel = server.channels.get(channelOrChannelID);
			let theMember = server.members.get(memberOrMemberID);
			bot.unmuteMember(theChannel, theMember, reason);
		} catch (err) {
			throw err;
		}
	}

	/**
	 * Gets a member in the server
	 * @param {StringResolvable|MemberResolvable} member The member or member ID to search for
	 * @returns {?GuildMember} The found member
	 */
	getMember (member) {
		member = member.id || member;
		let m;
		bot.memberSearch(server, member).then(foundMember => {
			m = new Member(foundMember);
		}).catch(() => {
			m = undefined;
		});
		return m;
	}

	/**
	 * Gets a users nickname or username in a server
	 * @param {UserResolvable|MemberResolvable} user The user or user ID to get the name / nickname from
	 * @param {Boolean} [ignoreNick=false] If you should ignore any nicknames
	 * @returns {String} The users name or nickname
	 */
	getMemberName (user, ignoreNick = false) {
		user = user.id || user;
		let member = server.members.get(user);
		if (!member) return "";
		return bot.getName(server, serverDocument, member, ignoreNick);
	}

	/**
	 * Gets the users admin level on this server
	 * @param {UserResolvable|MemberResolvable} user The user or user ID to get the admin level for
	 * @returns {Number} The admin level of the user
	 */
	getMemberAdminLevel (user) {
		user = user.id || user;
		let member = server.members.get(user);
		if (!member) return -1;
		return bot.getUserBotAdmin(server, serverDocument, member);
	}

	/**
	 * Gets a member data
	 * @param {UserResolvable|MemberResolvable} user The user or user ID to get the data for
	 * @returns {Promise<?Object>} The member data
	 */
	async getMemberData (user) {
		user = user.id || user;
		let member = server.members.get(user);
		if (!member) throw new Error(`Invalid user, user ID, member or member ID!`);
		const memberDocument = serverDocument.members.id(member.id);
		if (memberDocument) return memberDocument.toObject();
		throw new Error(`Couldn't find a member document for the specified user!`);
	}

	/**
	 * Adds a strike to a user
	 * @param {UserResolvable|MemberResolvable} user The user or user ID to add a strike to
	 * @param {String} reason The reason for the strike
	 * @returns {Promise<?Object>} Object containing the updated member document
	 */
	async addMemberStrike (user, reason) {
		user = user.id || user;
		let member = server.members.get(user);
		if (!member) throw new Error(`Invalid user, user ID, member or member ID!`);
		if (!member.user.bot) {
			let memberDocument = serverDocument.members.id(member.id);
			let document;
			if (!memberDocument) {
				serverDocument.members.push({ _id: member.id });
				memberDocument = serverDocument.members.id(member.id);
			}
			memberDocument.strikes.push({
				_id: bot.user.id,
				reason,
			});
			serverDocument.save().then(() => {
				document = memberDocument.toObject();
			}).catch(() => {
				throw new Error(`Failed to save the new member document..`);
			});
			return document;
		}
	}

	/**
	 * Sets a key from a member
	 * @param {UserResolvable|MemberResolvable} user The user or user ID to set the key for
	 * @param {*} key The key to set the value for
	 * @param {*} value The value for the key
	 * @returns {Promise<?Object>} Object containing the updated member document
	 */
	async setMemberDataKey (user, key, value) {
		user = user.id || user;
		let member = server.members.get(user);
		if (!member) throw new Error(`Invalid user, user ID, member or member ID!`);
		if (!member.user.bot) {
			let memberDocument = serverDocument.members.id(member.id);
			let document;
			if (!memberDocument) {
				serverDocument.members.push({ _id: member.id });
				memberDocument = serverDocument.members.id(member.id);
			}
			if (!memberDocument.profile_fields) memberDocument.profile_fields = {};
			memberDocument.profile_fields[key] = value;
			serverDocument.markModified("members");
			serverDocument.save().then(() => {
				document = memberDocument.toObject();
			}).catch(() => {
				throw new Error(`Failed to save the new member document..`);
			});
			return document;
		}
	}

	/**
	 * Deletes a key from a member
	 * @param {UserResolvable|MemberResolvable} user The user or user ID to set the key for
	 * @param {*} key The key to delete
	 * @returns {Promise<?Object>} Object containing the updated member document
	 */
	async deleteMemberDataKey (user, key) {
		user = user.id || user;
		let member = server.members.get(user);
		if (!member) throw new Error(`Invalid user, user ID, member or member ID!`);
		if (!member.user.bot) {
			let memberDocument = serverDocument.members.id(member.id);
			let document;
			if (!memberDocument) {
				serverDocument.members.push({ _id: member.id });
				memberDocument = serverDocument.members.id(member.id);
			}
			if (!memberDocument.profile_fields) memberDocument.profile_fields = {};
			delete memberDocument.profile_fields[key];
			serverDocument.markModified("members");
			serverDocument.save().then(() => {
				document = memberDocument.toObject();
			}).catch(() => {
				throw new Error(`Failed to save the new member document..`);
			});
			return document;
		}
	}

	/**
	 * Gets you the user document
	 * @param {UserResolvable|MemberResolvable} user The user to get the user document for
	 * @returns {Promise<?Object>} Object containing the user document
	 */
	async getUserData (user) {
		user = user.id || user;
		let member = server.members.get(user);
		if (!member) throw new Error(`Invalid user, user ID, member or member ID!`);
		let userDocument;
		try {
			userDocument = await db.users.findOne({ _id: member.id });
		} catch (err) {
			throw new Error(`Failed to find user data for the provided user!`);
		}
		return userDocument.toObject();
	}

	/**
	 * Handles a member violation
	 * @param {TextChannel} ch the text channel the violation happened in 
	 * @param {GuildMember} m The member that triggered the violation 
	 * @param {String} userMessage The message the user should get
	 * @param {String} adminMessage The message the admins should get
	 * @param {String} strikeMessage The strike message that appears in the modlog (if enabled)
	 * @param {String} action  The action to take, can be one of `none`, `block`, `kick` or `ban`,
	 * @param {Role} [r] Optional role to assign to the member
	 */
	async handleViolation (ch, m, userMessage, adminMessage, strikeMessage, action, r) {
		ch = ch.id || ch;
		m = m.id || m;
		r = r.id || r || null;
		let channell = server.channels.get(ch);
		if (!channell || channell.type !== "text") throw new Error(`Invalid channel!`);
		let member = server.members.get(member);
		if (!member) throw new Error(`Invalid user, user ID, member or member ID!`);
		let role = server.roles.get(r);
		if (!member.user.bot) {
			const findDocument = await db.users.findOrCreate({ _id: member.id }).catch(() => {
				throw new Error(`Failed to find or create a user document for the member..`);
			});
			let userDocument;
			if (findDocument.doc) userDocument = findDocument.doc;
			if (userDocument) {
				let memberDocument = serverDocument.members.id(member.id);
				if (!memberDocument) {
					serverDocument.members.push({ _id: member.id });
					memberDocument = serverDocument.members.id(member.id);
				}
				serverDocument.save().then(async () => {
					await bot.handleViolation(server, serverDocument, channell, member, userDocument, memberDocument, userMessage, adminMessage, strikeMessage, action, role);
				}).catch(() => {
					throw new Error(`Failed to handle the violation on the member!`);
				});
			}
		}
	}
};
