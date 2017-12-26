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
};

// Should all be functions for consistency, even if the string is hardcoded.
exports.Text = {
	COMMAND_ERR: () => "Something went wrong! 😱",
	INVALID_USAGE: (commandData, prefix = null) => `🗯 Correct usage is: \`${prefix ? prefix : ""}${commandData.name} ${commandData.usage}\``,
};

// Hardcoded names for the child process manager
exports.ChildProcessTypes = {
	MATH: "mathjs",
};

exports.ChildProcessCommands = {
	MATHJS: {
		EVAL: "eval",
		HELP: "help",
	},
};
