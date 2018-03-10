exports.ModLogEntries = {
	ADD_ROLE: "Add Role",
	REMOVE_ROLE: "Remove Role",

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
 * Client.logMessage
 */
exports.LoggingLevels = {
	INFO: "info",
	ERROR: "error",
	WARN: "warn",
	SAVE: "save",
};

exports.Colors = {
	// An *uncaught* error occurred, the command could not finish executing
	RED: 0xFF0000,
	ERROR: 0xFF0000,
	ERR: 0xFF0000,

	// An expected problem was found, the command finished executing. Problems such as no results, etc.
	LIGHT_RED: 0xCC0F16,
	SOFT_ERR: 0xCC0F16,

	// The user executing the commands was missing permissions required to execute the command
	LIGHT_ORANGE: 0xE55B0A,
	MISSING_PERMS: 0xE55B0A,

	// The user requested data to be updated, or the bot to perform an action. This finished with success
	GREEN: 0x00FF00,
	SUCCESS: 0x00FF00,

	// The user requested data to be returned. The bot fetched the data with success
	LIGHT_GREEN: 0x43B581,
	RESPONSE: 0x43B581,

	// The bot is notifying the user of something, either in response to a command, or resulting from an event
	BLUE: 0x3669FA,
	INFO: 0x3669FA,

	// The bot is requesting more data from the user before it can continue executing the command
	LIGHT_BLUE: 0x9ECDF2,
	INPUT: 0x9ECDF2,
	PROMPT: 0x9ECDF2,

	// The user passed invalid command parameters to the bot, and the command could not be parsed
	YELLOW: 0xFFFF00,
	INVALID: 0xFFFF00,

	// A trivia game has started or ended
	TRIVIA_START: 0x50FF60,
	TRIVIA_END: 0x2B67FF,
};

// Should all be functions for consistency, even if the string is hardcoded.
exports.Text = {
	COMMAND_ERR: () => "Something went wrong! 😱",
	INVALID_USAGE: (commandData, prefix = null) => `🗯 Correct usage is: \`${prefix ? prefix : ""}${commandData.name} ${commandData.usage}\``,
	MISSING_PERMS: serverName => `🔐 You don't have permission to use this command${serverName ? `on ${serverName}` : "."}`,
	NSFW_INVALID: () => `You need to give me something to search for! ( ͡° ͜ʖ ͡° )`,
};

// Hardcoded names for the child process manager
exports.WorkerTypes = {
	MATH: "mathjs",
};

exports.WorkerCommands = {
	MATHJS: {
		EVAL: "eval",
		HELP: "help",
	},
};

exports.WorkerEvents = {
	RUN_MATH: "runMathCommand",
};

// Emojis used in menu-like things
exports.PageEmojis = {
	back: "◀",
	stop: "⏹",
	forward: "▶",
};

// Numbered emojis from one to ten
exports.NumberEmojis = {
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
 * Emojis that are used in the help menu, each representing:
 * ℹ -- Main menu
 * 🤖 -- GAB commands, like ping
 * 🎪 -- Fun commands
 * ⚒ -- ~~Communism~~ Moderation
 * 🎬 -- Sarch and Media
 * 👹 -- NSFW
 * ⭐️ -- Stats and points (and starboard 👀)
 * 🔦 -- Utility commands
 * ⚙️ -- Extension Commands
 */
exports.HelpMenuEmojis = {
	info: "ℹ",
	gab: "🤖",
	fun: "🎪",
	mod: "⚒",
	media: "🎬",
	nsfw: "👹",
	stats: "⭐",
	util: "🔦",
	extension: "⚙️",
};

/**
 * I was super lazy to do if-checks so I did this instead.
 * Sorry. -- Vlad
 */
exports.CategoryEmojiMap = {
	"Extensions ⚙️": "⚙️",
	"Fun 🎪": "🎪",
	"GAwesomeBot 🤖": "🤖",
	"Moderation ⚒": "⚒",
	"NSFW 👹": "👹",
	"Search & Media 🎬": "🎬",
	"Stats & Points ⭐️": "⭐",
	"Utility 🔦": "🔦",
};

exports.Templates = {
	ReactionMenu: {
		title: `Choose a number`,
		color: exports.Colors.BLUE,
		description: `{list}`,
		footer: `Page {current} out of {total}`,
	},
};

exports.APIs = {
	ANIME: filter => `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(filter)}`,
	CATFACT: number => `https://catfact.ninja/facts?limit=${number}`,
	DOGFACT: number => `https://dog-api.kinduff.com/api/facts?number=${number}`,
	E621: query => `https://e621.net/post/index.json?tags=${encodeURIComponent(query)}&limit=256`,
	SPOOPYLINK: url => `https://spoopy.link/api/${url}`,
	FORTUNE: (category = null) => `http://yerkee.com/api/fortune/${category ? category : ""}`,
	GIPHY: (token, query, nsfw) => `http://api.giphy.com/v1/gifs/random?api_key=${token}&rating=${nsfw}&format=json&limit=1&tag=${encodeURIComponent(query)}`,
};

exports.EmptySpace = `\u200b`;

exports.Perms = {
	eval: "⚙ Evaluation (Can execute `eval`)",
	sudo: "🛡 Sudo Mode (Can act as a Server Admin)",
	management: "🔧 Management (Can access management)",
	administration: "🗂 Administration (Can manage the Bot User)",
	shutdown: "🌟 Shutdown (Can manage GAB Processes)",
};

// Events that can be used to create event extensions. D.js events that are not in this list will be disabled on the worker process
exports.AllowedEvents = [
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

// Embed object for NSFW commands
exports.NSFWEmbed = {
	embed: {
		color: exports.Colors.SOFT_ERR,
		title: `I'm sorry, but I can't let you do that! 🙄`,
		description: `You'll have to run this command in a channel that is marked **NSFW**!`,
		footer: {
			text: `Ask an Admin to edit this channel and make it NSFW. Then you can use this command as much as you like`,
		},
	},
};

exports.APIResponses = {
	servers: {
		success: data => ({ err: null, data }),
		notFound: () => ({ err: "Server not found", data: null }),
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

// Categories for the fortune command
exports.FortuneCategories = [
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
