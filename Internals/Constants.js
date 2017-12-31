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
};

// Hardcoded names for the child process manager
exports.WorkerTypes = {
	MATH: "mathjs",
	CONVERT: "convert",
};

exports.WorkerCommands = {
	MATHJS: {
		EVAL: "eval",
		HELP: "help",
	},
};

exports.WorkerEvents = {
	RUN_MATH: "runMathCommand",
	CONVERT_DATA: "convertData",
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

exports.APIs = {
	ANIME: filter => `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(filter)}`,
	CATFACT: () => `https://catfact.ninja/facts`,
};

// You may think there is nothing here
// In reality, there's a 0-width space
exports.EmptySpace = `​`;

exports.Perms = {
	eval: "⚙ Evaluation (Can execute `eval`)",
	sudoMode: "🛡 Sudo Mode (Can act as a Server Admin)",
	management: "🔧 Management (Can access management)",
	administration: "🗂 Administration (Can manage the Bot User)",
	shutdown: "🌟 Shutdown (Can manage GAB Processes)",
};
