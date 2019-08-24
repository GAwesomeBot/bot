/* eslint node/exports-style: ["error", "exports"] */
/* eslint-disable max-len */

/**
 * Constant hardcoded values used by GAB
 * @namespace
 */
const Constants = exports;

/**
 * Formatted ModLog action descriptions
 * @type {{ADD_ROLE: string, CREATE_ROLE: string, REMOVE_ROLE: string, DELETE_ROLE: string, MODIFY_ROLE: string, KICK: string, BAN: string, SOFTBAN: string, TEMP_BAN: string, UNBAN: string, MUTE: string, TEMP_MUTE: string, UNMUTE: string, BLOCK: string, STRIKE: string, OTHER: string}}
 */
Constants.ModLogEntries = {
	ADD_ROLE: "Add Role",
	CREATE_ROLE: "Create Role",
	REMOVE_ROLE: "Remove Role",
	DELETE_ROLE: "Delete Role",
	MODIFY_ROLE: "Modify Role",

	KICK: "Kick",
	BAN: "Ban",
	SOFTBAN: "Softban",
	TEMP_BAN: "Temp Ban",
	UNBAN: "Unban",

	MUTE: "Mute",
	TEMP_MUTE: "Temp Mute",
	UNMUTE: "Unmute",

	BLOCK: "Block",
	STRIKE: "Strike",

	OTHER: "Other",
};

/**
 * Levels for GABClient.logMessage
 * @type {{INFO: string, ERROR: string, WARN: string, SAVE: string}}
 */
Constants.LoggingLevels = {
	INFO: "info",
	ERROR: "error",
	WARN: "warn",
	SAVE: "save",
};

/**
 * Various color codes for use in embeds
 * @type object
 * @property {number} RED - An uncaught error occurred, the command could not finish executing
 * @property {number} ERROR - An uncaught error occurred, the command could not finish executing
 * @property {number} ERR - Alias of ERROR
 * @property {number} LIGHT_RED - An expected problem was found, the command finished executing. Problems such as no results, etc.
 * @property {number} SOFT_ERR - An expected problem was found, the command finished executing. Problems such as no results, etc.
 * @property {number} LIGHT_ORANGE - The user executing the commands was missing permissions required to execute the command
 * @property {number} MISSING_PERMS - The user executing the commands was missing permissions required to execute the command
 * @property {number} GREEN - The user requested data to be updated, or the bot to perform an action. This finished with success
 * @property {number} SUCCESS - The user requested data to be updated, or the bot to perform an action. This finished with success
 * @property {number} LIGHT_GREEN - The user requested data to be returned. The bot fetched the data with success
 * @property {number} RESPONSE - The user requested data to be returned. The bot fetched the data with success
 * @property {number} BLUE - The bot is notifying the user of something, either in response to a command, or resulting from an event
 * @property {number} INFO - The bot is notifying the user of something, either in response to a command, or resulting from an event
 * @property {number} LIGHT_BLUE - The bot is requesting more data from the user before it can continue executing the command
 * @property {number} INPUT - The bot is requesting more data from the user before it can continue executing the command
 * @property {number} PROMPT - Alias of INPUT
 * @property {number} YELLOW - The user passed invalid command parameters to the bot, and the command could not be parsed
 * @property {number} INVALID - The user passed invalid command parameters to the bot, and the command could not be parsed
 * @property {number} TRIVIA_START - A trivia game has started
 * @property {number} TRIVIA_END - A trivia game has ended
 * @property {number} YOUTUBE
 * @property {number} TWITCH
 * @property {number} TWITTER
 */
Constants.Colors = {
	RED: 0xFF0000,
	ERROR: 0xFF0000,
	ERR: 0xFF0000,

	LIGHT_RED: 0xCC0F16,
	SOFT_ERR: 0xCC0F16,

	LIGHT_ORANGE: 0xE55B0A,
	MISSING_PERMS: 0xE55B0A,

	GREEN: 0x00FF00,
	SUCCESS: 0x00FF00,

	LIGHT_GREEN: 0x43B581,
	RESPONSE: 0x43B581,

	BLUE: 0x3669FA,
	INFO: 0x3669FA,

	LIGHT_BLUE: 0x9ECDF2,
	INPUT: 0x9ECDF2,
	PROMPT: 0x9ECDF2,

	YELLOW: 0xFFFF00,
	INVALID: 0xFFFF00,

	TRIVIA_START: 0x50FF60,
	TRIVIA_END: 0x2B67FF,

	TWITCH: 0x6441A5,
	YOUTUBE: 0xFF0000,
	TWITTER: 0x1da1f2,
};

/**
 * Various functions that return text displayed to the End User
 * @type {{ERROR_TITLE: (function(): string), ERROR_BODY: (function(string, string): string), ERROR_FOOTER: (function(): string), OWO_ERROR_BODY: (function(): string), INVALID_USAGE: (function(object, string=): string), MISSING_PERMS: (function(string): string), NSFW_INVALID: (function(): string), INVITE: (function(GABClient): {embed: {color: number, title: string, description: string}}), GUILD_VERIFICATION_LEVEL: (function(string): string)}}
 */
Constants.Text = {
	ERROR_TITLE: () => "Something went wrong! 😱",
	ERROR_BODY: (cmd, stack) => `Something went wrong while executing \`${cmd}\`!${stack ? `\n**Error Message**: \`\`\`js\n${stack}\`\`\`` : ""}`,
	ERROR_FOOTER: () => "Contact your GAB maintainer for more support.",
	OWO_ERROR_BODY: () => "OOPSIE WOOPSIE!! Uwu We made a fucky wucky!! A wittle fucko boingo! The code monkeys at our headquarters are working VEWY HAWD to fix this!",
	INVALID_USAGE: (commandData, prefix = null) => `🗯 Correct usage is: \`${prefix ? prefix : ""}${commandData.name} ${commandData.usage}\``,
	MISSING_PERMS: serverName => `🔐 You don't have permission to use this command${serverName ? ` on ${serverName}` : "."}`,
	NSFW_INVALID: () => `You need to give me something to search for! ( ͡° ͜ʖ ͡° )`,
	INVITE: client => ({
		embed: {
			color: Constants.Colors.LIGHT_GREEN,
			title: `Thanks for choosing me! 😊`,
			description: [
				`To add me, follow [this URL](${configJS.oauthLink.format({ id: client.user.id })})`,
				"",
				"The above link contains all permissions that are required to be able to run any of my commands.",
				"We know that not all permissions are right for each server, so feel free to uncheck some boxes.",
				"We'll let you know if we're missing any permissions for running certain commands!",
				"",
				// eslint-disable-next-line max-len
				"For the best experience with me, please make sure I have at least `Send Messages`, `Embed Links`, `Add Reactions` and `Manage Messages`! That way you'll be able to use most of my features right away!",
			].join("\n"),
		},
	}),
	THIRD_PARTY_FETCH: description => ({
		embed: {
			color: Constants.Colors.INFO,
			title: `${description && description !== "" ? description : "Fetching data"} ⌛`,
			description: "Please stand by...",
		},
	}),
	EXTENSION_RUN: extensionName => ({
		embed: {
			color: Constants.Colors.INFO,
			title: `Running extension **${extensionName}** ⚙`,
			description: "Please stand by... ⌛",
			footer: {
				text: "Is this message not disappearing within seconds? Contact a Server Admin for help.",
			},
		},
	}),
	EXTENSION_FAIL: extensionName => ({
		embed: {
			color: Constants.Colors.ERROR,
			title: "Something went wrong! ⚙",
			description: `An error has occurred while executing **${extensionName}**.`,
			footer: {
				text: "GAB is most likely not at fault; contact a Server Admin or the Extension Author to resolve this issue.",
			},
		},
	}),
	GUILD_VERIFICATION_LEVEL: level => Constants.GUILD_VERIFICATION_LEVELS[level],
};

/**
 * Functions that return embed objects for usage in Status Messages
 * @type object
 */
Constants.StatusMessages = {
	GAME_STREAMING: (name, game) => ({
		title: "Status Messages - Member Streaming",
		url: game.url,
		description: `**${name}** is streaming **${game.name}**! 🎮`,
		color: Constants.Colors.TWITCH,
	}),
	GAME_UPDATE: (name, game) => ({
		title: "Status Messages - Game Updated",
		description: `**${name}** started playing **${game.name}** 🎮`,
		color: Constants.Colors.LIGHT_GREEN,
	}),
	GUILD_BAN_ADD: (message, user) => ({
		footer: {
			text: `User ID: ${user.id}`,
		},
		thumbnail: {
			url: user.displayAvatarURL(),
		},
		title: "Status Messages - Member Banned",
		description: message.replaceAll("@user", `**@${user.tag}**`),
		color: Constants.Colors.RED,
		timestamp: Date.now(),
	}),
	GUILD_BAN_REMOVE: (message, user) => ({
		footer: {
			text: `User ID: ${user.id}`,
		},
		thumbnail: {
			url: user.displayAvatarURL(),
		},
		title: "Status Messages - Member Unbanned",
		description: message.replaceAll("@user", `**@${user.tag}**`),
		color: Constants.Colors.GREEN,
		timestamp: Date.now(),
	}),
	GUILD_MEMBER_ADD: (message, member, serverDocument, client) => ({
		footer: {
			text: `Member ID: ${member.id}`,
		},
		thumbnail: {
			url: member.user.displayAvatarURL(),
		},
		title: "Status Messages - Member Joined",
		description: message.replaceAll("@user", `**@${client.getName(serverDocument, member)}**`).replaceAll("@mention", `<@!${member.id}>`),
		color: Constants.Colors.LIGHT_GREEN,
		timestamp: Date.now(),
	}),
	GUILD_MEMBER_REMOVE: (message, member, serverDocument, client) => ({
		footer: {
			text: `Member ID: ${member.id}`,
		},
		thumbnail: {
			url: member.user.displayAvatarURL(),
		},
		title: "Status Messages - Member Left",
		description: message.replaceAll("@user", `**@${client.getName(serverDocument, member)}**`),
		color: Constants.Colors.LIGHT_ORANGE,
		timestamp: Date.now(),
	}),
	GUILD_UPDATE_NAME: (oldName, guild) => ({
		thumbnail: {
			url: guild.iconURL(),
		},
		title: "Status Messages - Name Changed",
		description: `Guild Name changed from **${oldName}** to **${guild.name}**`,
		color: Constants.Colors.BLUE,
		timestamp: Date.now(),
	}),
	GUILD_UPDATE_ICON: (oldIcon, guild) => ({
		thumbnail: {
			url: guild.iconURL(),
		},
		title: "Status Messages - Icon Changed",
		description: `Guild icon changed from ${oldIcon ? `[old icon](${oldIcon})` : "default"} to ${guild.iconURL() ? `[new icon](${guild.iconURL()})` : "default"}`,
		color: Constants.Colors.BLUE,
		timestamp: Date.now(),
	}),
	GUILD_UPDATE_REGION: (oldRegion, newRegion, guild) => ({
		thumbnail: {
			url: guild.iconURL(),
		},
		title: "Status Messages - Region Changed",
		description: `Guild voice region changed from ${oldRegion} to ${newRegion}`,
		color: Constants.Colors.BLUE,
		timestamp: Date.now(),
	}),
	MEMBER_CREATE_NICK: (member, serverDocument, client) => ({
		footer: {
			text: `Member ID: ${member.id}`,
		},
		thumbnail: {
			url: member.user.displayAvatarURL(),
		},
		title: "Status Messages - Nickname Created",
		description: `**@${client.getName(serverDocument, member)}** created a nickname: \`${member.nickname}\``,
		color: Constants.Colors.BLUE,
		timestamp: Date.now(),
	}),
	MEMBER_CHANGE_NICK: (member, oldNickname, serverDocument, client) => ({
		footer: {
			text: `Member ID: ${member.id}`,
		},
		thumbnail: {
			url: member.user.displayAvatarURL(),
		},
		title: "Status Messages - Nickname Updated",
		description: `**@${client.getName(serverDocument, member)}** changed their nickname from \`${oldNickname}\` to \`${member.nickname}\``,
		color: Constants.Colors.BLUE,
		timestamp: Date.now(),
	}),
	MEMBER_REMOVE_NICK: (member, oldNickname, serverDocument, client) => ({
		footer: {
			text: `Member ID: ${member.id}`,
		},
		thumbnail: {
			url: member.user.displayAvatarURL(),
		},
		title: "Status Messages - Nickname Removed",
		description: `**@${client.getName(serverDocument, member)}** removed their nickname \`${oldNickname}\``,
		color: Constants.Colors.BLUE,
		timestamp: Date.now(),
	}),
	MESSAGE_DELETED: (type, msg, serverDocument, client) => ({
		footer: {
			text: `Member ID: ${msg.author.id} • Channel ID: ${msg.channel.id}`,
		},
		thumbnail: {
			url: msg.author.displayAvatarURL(),
		},
		title: "Status Messages - Message Deleted",
		description: `A message by **@${client.getName(serverDocument, msg.member)}** ${type === "single" ? `in <#${msg.channel.id}> ` : ""}was deleted:\n\`\`\`\n${msg.cleanContent.replace(/`/g, "\\`")}\n\`\`\``,
		color: Constants.Colors.LIGHT_RED,
		timestamp: Date.now(),
	}),
	MESSAGE_EDITED: (type, msg, oldMsg, serverDocument, client) => ({
		footer: {
			text: `Member ID: ${msg.author.id} • Channel ID: ${msg.channel.id}`,
		},
		thumbnail: {
			url: msg.author.displayAvatarURL(),
		},
		title: "Status Messages - Message Edited",
		description: `A message by **@${client.getName(serverDocument, msg.member)}** ${type === "single" ? `in <#${msg.channel.id}> ` : ""}was edited:\n\nOriginal:\`\`\`\n${oldMsg.cleanContent.replace(/`/g, "\\`")}\`\`\`\nCurrent:\`\`\`\n${msg.cleanContent.replace(/`/g, "\\`")}\n\`\`\``,
		color: Constants.Colors.LIGHT_ORANGE,
		timestamp: Date.now(),
	}),
	USER_AVATAR_UPDATED: (client, serverDocument, oldUser, newMember) => ({
		footer: {
			text: `Member ID: ${newMember.id}`,
		},
		thumbnail: {
			url: newMember.user.displayAvatarURL(),
		},
		title: "Status Messages - Avatar Updated",
		description: `**${client.getName(serverDocument, newMember)}** has changed [their old avatar](${oldUser.displayAvatarURL()}).`,
		color: Constants.Colors.YELLOW,
		timestamp: Date.now(),
	}),
	USER_USERNAME_UPDATED: (client, serverDocument, oldUser, newMember) => ({
		footer: {
			text: `Member ID: ${newMember.id}`,
		},
		thumbnail: {
			url: newMember.user.displayAvatarURL(),
		},
		title: "Status Messages - Username Updated",
		description: `**${client.getName(serverDocument, { user: oldUser }, true)}** has changed their username to **${client.getName(serverDocument, newMember, true)}**.`,
		color: Constants.Colors.YELLOW,
		timestamp: Date.now(),
	}),
};

/**
 * An array of verification level descriptions ordered by severity
 * @type {string[]}
 */
Constants.GUILD_VERIFICATION_LEVELS = [
	"None",
	"Low - must have verified email on account",
	"Medium - must be registered on Discord for longer than 5 minutes",
	"High - (╯°□°）╯︵ ┻━┻ - must be a member of the server for longer than 10 minutes",
	"Very High - ┻━┻ミヽ(ಠ益ಠ)ﾉ彡┻━┻ - must have a verified phone number",
];

/**
 * Hardcoded names for worker process manager
 * @type {{MATH: string, EMOJI: string}}
 */
Constants.WorkerTypes = {
	MATH: "mathjs",
	EMOJI: "emoji",
	EXTENSION: "extension",
};

Constants.WorkerCommands = {
	MATHJS: {
		EVAL: "eval",
		HELP: "help",
	},
};

Constants.WorkerEvents = {
	RUN_MATH: "runMathCommand",
	JUMBO_EMOJI: "jumboEmoji",
	RUN_EXTENSION: "runExtension",
};

/**
 * Emojis used in menu objects
 * @type {{back: string, stop: string, forward: string}}
 */
Constants.PageEmojis = {
	back: "◀",
	stop: "⏹",
	forward: "▶",
};

/**
 * Numbered emojis from 1 to 10
 * @type {{one: string, two: string, three: string, four: string, five: string, six: string, seven: string, eight: string, nine: string, ten: string}}
 */
Constants.NumberEmojis = {
	one: "1⃣",
	two: "2⃣",
	three: "3⃣",
	four: "4⃣",
	five: "5⃣",
	six: "6⃣",
	seven: "7⃣",
	eight: "8⃣",
	nine: "9⃣",
	ten: "🔟",
};

/**
 * Emojis that are used in the help menu
 * @property {string} info - Main menu
 * @property {string} gab - GAB commands, like ping
 * @property {string} fun - Fun commands
 * @property {string} mod - ~~Communism~~ Moderation commands
 * @property {string} media - Search and Media commands
 * @property {string} nsfw - NSFW commands
 * @property {string} stats - Stats and points
 * @property {string} util - Utility commands
 * @property {string} extension - Extension commands
 */
Constants.HelpMenuEmojis = {
	info: "ℹ",
	gab: "🤖",
	fun: "🎪",
	mod: "⚒",
	media: "🎬",
	nsfw: "👹",
	stats: "⭐",
	util: "🔦",
	extension: "⚙",
};

/**
 * I was super lazy to do if-checks so I did this instead.
 * Sorry. -- Vlad
 * @type object
 */
Constants.CategoryEmojiMap = {
	"Extensions ⚙️": "⚙",
	"Fun 🎪": "🎪",
	"GAwesomeBot 🤖": "🤖",
	"Moderation ⚒": "⚒",
	"NSFW 👹": "👹",
	"Search & Media 🎬": "🎬",
	"Stats & Points ⭐️": "⭐",
	"Utility 🔦": "🔦",
};

Constants.Templates = {
	ReactionMenu: {
		title: `Choose a number`,
		color: Constants.Colors.BLUE,
		description: `{list}`,
		footer: `Page {current} out of {total}`,
	},
	StreamingTemplate: data => {
		const color = Constants.Colors[data.type.toUpperCase()] || Constants.Colors.INFO;
		return {
			embed: {
				color,
				description: `${data.name} started streaming \`${data.game}\` on **${data.type}**\nWatch them by clicking [**here**](${data.url})\n\nHere is a preview of the stream:`,
				author: {
					name: data.name,
					iconURL: data.streamerImage,
					url: data.url,
				},
				image: {
					url: data.preview,
				},
			},
		};
	},
};

/**
 * An object of API endpoints GAB interacts with
 * @type {{ANIME: (function(*=): string), CATFACT: (function(*): string), DOGFACT: (function(*): string), E621: (function(*=): string), FORTUNE: (function(*=): string), GIPHY: (function(*, *=, *): string), JOKE: (function(): string), NUMFACT: (function(*): string), REDDIT: (function(*): string), SPOOPYLINK: (function(*): string), URBAN: (function(*=, *=): string)}}
 */
Constants.APIs = {
	ANIME: filter => `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(filter)}`,
	BITLY: action => `https://api-ssl.bitly.com/v4/${action}`,
	CATFACT: number => `https://catfact.ninja/facts?limit=${number}`,
	DOGFACT: number => `https://dog-api.kinduff.com/api/facts?number=${number}`,
	E621: query => `https://e621.net/post/index.json?tags=${encodeURIComponent(query)}&limit=256`,
	FORTUNE: (category = null) => `http://yerkee.com/api/fortune/${category ? category : ""}`,
	GIPHY: (token, query, nsfw) => `http://api.giphy.com/v1/gifs/random?api_key=${token}&rating=${nsfw}&format=json&limit=1&tag=${encodeURIComponent(query)}`,
	JOKE: () => `https://icanhazdadjoke.com`,
	NUMFACT: num => `http://numbersapi.com/${num}`,
	REDDIT: subreddit => `https://www.reddit.com/r/${subreddit}.json`,
	SAFEBOORU: (query, num) => `https://safebooru.donmai.us/posts.json?page=0&tags=${encodeURIComponent(query)}&limit=${num}`,
	SPOOPYLINK: url => `https://spoopy.link/api/${url}`,
	TWITRSS: user => `http://twitrss.me/twitter_user_to_rss/?user=${encodeURIComponent(user)}`,
	URBAN: (term, page = 1) => `https://api.urbandictionary.com/v0/${!term ? "random" : `define?page=${page}&term=${encodeURIComponent(term)}`}`,
	WEATHER: (key, query) => `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${key}&units=metric`,
	WOLFRAM: (appid, query) => `https://api.wolframalpha.com/v2/query?appid=${appid}&input=${query}&output=json`,
	XKCD: num => `https://xkcd.com/${num ? `${num}/` : ""}info.0.json`,
	YOUTUBE: (key, query, num) => `https://www.googleapis.com/youtube/v3/search?part=snippet&key=${key}&q=${encodeURIComponent(query)}&maxResults=${num}`,
};

/**
 * Endpoints of GAB's CENTRAL API. Changing this value is not recommended and will almost certainly cause major issues.
 * @type {string}
 */
Constants.CENTRAL = {
	VERSIONING: "https://status.gawesomebot.com/api/versions/",
	CODEBASE: "https://codeload.github.com/GilbertGobbels/GAwesomeBot/zip/",
};

Constants.CODEBASE_TOTAL_CHUNK_SIZE = 10300000;

/**
 * Default value of the useragent header on all requests made to third-party endpoints.
 * @type {string}
 */
Constants.UserAgent = "GAwesomeBot (https://github.com/GilbertGobbels/GAwesomeBot)";

/**
 * An empty space
 * @type {string}
 */
Constants.EmptySpace = `\u200b`;

/**
 * Descriptions of Maintainer permissions
 * @type {{eval: string, sudo: string, management: string, administration: string, shutdown: string}}
 */
Constants.Perms = {
	eval: "⚙ Evaluation (Can execute `eval`)",
	sudo: "🛡 Sudo Mode (Can act as a Server Admin)",
	management: "🔧 Management (Can access management)",
	administration: "🗂 Administration (Can manage the Bot User)",
	shutdown: "🌟 Shutdown (Can manage GAB Processes)",
};

/**
 * List of events that can be used to create event extensions. D.js events that are not in this list will be disabled on the worker process
 * @type {string[]}
 */
Constants.AllowedEvents = [
	"channelCreate",
	"channelDelete",
	"channelUpdate",
	"channelPinsUpdate",
	"emojiCreate",
	"emojiDelete",
	"emojiUpdate",
	"guildBanAdd",
	"guildBanRemove",
	"guildMemberAdd",
	"guildMemberRemove",
	"guildMemberSpeaking",
	"guildMemberUpdate",
	"guildUpdate",
	"messageDelete",
	"messageDeleteBulk",
	"messageReactionAdd",
	"messageReactionRemove",
	"messageReactionRemoveAll",
	"messageUpdate",
	"roleCreate",
	"roleDelete",
	"roleUpdate",
	"voiceStateUpdate",
];

/**
 * An object containing descriptive information on all extension scopes
 * @type object
 */
Constants.Scopes = {
	ban: {
		scope: "ban",
		permissionDescription: "Can ban members from this guild",
		authDescription: "Ban guild members",
		icon: "fa-gavel",
	},
	kick: {
		scope: "kick",
		permissionDescription: "Can kick members from this guild",
		authDescription: "Kick guild members",
		icon: "fa-gavel",
	},
	roles_read: {
		scope: "roles_read",
		permissionDescription: "Can read this guild's role list",
		authDescription: "Read guild roles",
		icon: "fa-flag",
	},
	roles_manage: {
		scope: "roles_manage",
		permissionDescription: "Can modify this guild's roles and assign roles to members",
		authDescription: "Modify and assign guild roles",
		icon: "fa-flag",
	},
	channels_read: {
		scope: "channels_read",
		permissionDescription: "Can access information about this guild's channels such as pinned messages or descriptions",
		authDescription: "Read guild channel settings, descriptions and pinned messages",
		icon: "fa-comments",
	},
	channels_manage: {
		scope: "channels_manage",
		permissionDescription: "Can modify this guild's channels",
		authDescription: "Modify guild channels and pin messages",
		icon: "fa-comments",
	},
	guild_read: {
		scope: "guild_read",
		permissionDescription: "Can access this guild's settings",
		authDescription: "Read guild settings",
		icon: "fa-home",
	},
	guild_manage: {
		scope: "guild_manage",
		permissionDescription: "Can modify this guild's settings",
		authDescription: "Modify guild settings",
		icon: "fa-home",
	},
	members_read: {
		scope: "members_read",
		permissionDescription: "Can access this guild's member list",
		authDescription: "Read the guild member list",
		icon: "fa-users",
	},
	members_manage: {
		scope: "members_manage",
		permissionDescription: "Can modify this guild's member list, for example by purging or managing nicknames",
		authDescription: "Manage guild members and purge the member list",
		icon: "fa-users",
	},
	messages_read: {
		scope: "messages_read",
		permissionDescription: "Can read previous messages in the channel this extension was executed in",
		authDescription: "Read messages in the channel that ran the extension",
		icon: "fa-search",
	},
	messages_global: {
		scope: "messages_global",
		permissionDescription: "Can read previous messages in all channels",
		authDescription: "Read messages in all channels",
		icon: "fa-globe",
	},
	messages_write: {
		scope: "messages_write",
		permissionDescription: "Can write messages in all channels. The extension can always write messages in the channel it was executed in",
		authDescription: "Send messages in all channels",
		icon: "fa-paper-plane",
	},
	messages_manage: {
		scope: "messages_manage",
		permissionDescription: "Can manage all messages in the channels where the extension can read messages",
		authDescription: "Delete messages",
		icon: "fa-trash",
	},
	config: {
		scope: "config",
		permissionDescription: "Can read, but not modify, this guild's GAB Configuration",
		authDescription: "Read {SERVER}'s GAB configuration",
		icon: "fa-cogs",
	},
};

/**
 * Embed object for NSFW commands in non-NSFW channels
 * @type {{embed: {color: number, title: string, description: string, footer: {text: string}}}}
 */
Constants.NSFWEmbed = {
	embed: {
		color: Constants.Colors.SOFT_ERR,
		title: `I'm sorry, but I can't let you do that! 🙄`,
		description: `You'll have to run this command in a channel that is marked **NSFW**!`,
		footer: {
			text: `Ask an Admin to edit this channel and mark it as NSFW.`,
		},
	},
};

/**
 * JSON Objects that are used as responses to requests to GAB's API
 * @type {{servers: {success: function, notFound: function, internalError: function}, users: {success: function, badRequest: function, notFound: function, internalError: function}, extensions: {success: function, notFound: function, internalError: function}}}
 */
Constants.APIResponses = {
	servers: {
		success: data => ({ err: null, data }),
		notFound: () => ({ err: "Server not found", data: null }),
		internalError: () => ({ err: "Internal server error", data: null }),
	},
	users: {
		success: data => ({ err: null, data }),
		badRequest: () => ({ err: "Request is invalid", data: null }),
		notFound: () => ({ err: "User not found", data: null }),
		internalError: () => ({ err: "Internal server error", data: null }),
	},
	extensions: {
		success: data => ({ err: null, data }),
		notFound: () => ({ err: "No extensions were found", data: null }),
		internalError: () => ({ err: "Internal server error", data: null }),
	},
};

/**
 * Categories for the fortune command
 * @type {string[]}
 */
Constants.FortuneCategories = [
	"all",
	"computers",
	"cookie",
	"definitions",
	"miscellaneous",
	"people",
	"platitudes",
	"politics",
	"science",
	"wisdom",
];

/**
 * EightBall values and wait times
 * @type {{WaitTimes: number[], Answers: *[]}}
 */
Constants.EightBall = {
	WaitTimes: [1000, 1500, 3000, 2500, 2000, 1250, 500, 300, 100, 600],
	Answers: [
		{
			color: 0x43B581,
			answer: "It is certain",
		},
		{
			color: 0x43B581,
			answer: "It is decidedly so",
		},
		{
			color: 0x43B581,
			answer: "Without a doubt",
		},
		{
			color: 0x43B581,
			answer: "Yes, definitely",
		},
		{
			color: 0x43B581,
			answer: "You may rely on it",
		},
		{
			color: 0x43B581,
			answer: "As I see it, yes",
		},
		{
			color: 0x43B581,
			answer: "Most likely",
		},
		{
			color: 0x43B581,
			answer: "Outlook good",
		},
		{
			color: 0x43B581,
			answer: "Yes",
		},
		{
			color: 0x43B581,
			answer: "Signs point to yes",
		},
		{
			color: 0xE55B0A,
			answer: "Reply hazy try again",
		},
		{
			color: 0xE55B0A,
			answer: "Ask again later",
		},
		{
			color: 0xE55B0A,
			answer: "Better not tell you now",
		},
		{
			color: 0xE55B0A,
			answer: "Cannot predict now",
		},
		{
			color: 0xE55B0A,
			answer: "Concentrate and ask again",
		},
		{
			color: 0xCC0F16,
			answer: "Don't count on it",
		},
		{
			color: 0xCC0F16,
			answer: "My reply is no",
		},
		{
			color: 0xCC0F16,
			answer: "My sources say no",
		},
		{
			color: 0xCC0F16,
			answer: "Outlook not so good",
		},
		{
			color: 0xCC0F16,
			answer: "Very doubtful",
		},
	],
};

/**
 * Past this line there can be snippets of code under specific licenses
 * The license will be specified above each item, if applicable
 */

/**
 * A set of regex strings for emojis
 * @type {{Text: RegExp, SkinToneText: RegExp, UnicodeSkinTone: RegExp, MobileSkinTone: RegExp}}
 */
Constants.EmojiRegex = {
	Text: /:.*?:/,
	SkinToneText: /:(.*?)::skin-tone-([1-5]):/,
	UnicodeSkinTone: /:(.*?):(🏻|🏼|🏽|🏾|🏿)/,
	// eslint-disable-next-line max-len
	MobileSkinTone: new RegExp("(\u{261D}|\u{26F9}|\u{270A}|\u{270B}|\u{270C}|\u{270D}|\u{1F385}|\u{1F3C3}|\u{1F3C4}|\u{1F3CA}|\u{1F3CB}|\u{1F442}|\u{1F443}|\u{1F446}|\u{1F447}|\u{1F448}|\u{1F449}|\u{1F44A}|\u{1F44B}|\u{1F44C}|\u{1F44D}|\u{1F44E}|\u{1F44F}|\u{1F450}|\u{1F466}|\u{1F467}|\u{1F468}|\u{1F469}|\u{1F46E}|\u{1F470}|\u{1F471}|\u{1F472}|\u{1F473}|\u{1F474}|\u{1F475}|\u{1F476}|\u{1F477}|\u{1F478}|\u{1F47C}|\u{1F481}|\u{1F482}|\u{1F483}|\u{1F485}|\u{1F486}|\u{1F487}|\u{1F4AA}|\u{1F575}|\u{1F57A}|\u{1F590}|\u{1F595}|\u{1F596}|\u{1F645}|\u{1F646}|\u{1F647}|\u{1F64B}|\u{1F64C}|\u{1F64D}|\u{1F64E}|\u{1F64F}|\u{1F6A3}|\u{1F6B4}|\u{1F6B5}|\u{1F6B6}|\u{1F6C0}|\u{1F918}|\u{1F919}|\u{1F91A}|\u{1F91B}|\u{1F91C}|\u{1F91D}|\u{1F91E}|\u{1F926}|\u{1F930}|\u{1F933}|\u{1F934}|\u{1F935}|\u{1F936}|\u{1F937}|\u{1F938}|\u{1F939}|\u{1F93C}|\u{1F93D}|\u{1F93E}):skin-tone-([1-5]):"),
};

Constants.OfficialMode = ["344473886337007617", "231849525185216512", "614196964027924482"];
