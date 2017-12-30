const { register } = require("./GABError");

const Messages = {
	// Class-related
	STATIC_CLASS: name => `The ${name} class should not be instantiated!`,
	NON_OVERWRITTEN: prop => `The ${prop} function has not been overwritten!`,

	// Event Related
	UNKNOWN_EVENT: event => `Unknown event received: ${event}`,
	NO_HANDLE: event => `${event} doesn't have the handle method overwritten!`,

	// Search-related
	FAILED_TO_FIND: (type, server, string) => `Couldn't find a ${type} in "${server}" using string "${string}"`,

	// Misc
	FEATURE_TODO: `This feature is currently not implemented. It might be re-done eventually`,
	// Await PM messages
	AWAIT_EXPIRED: `The await for the message expired!`,
	AWAIT_QUIT: `The user quitted the menu!`,

	// Shared Command related
	UNAUTHORIZED_USER: user => `"${user.tag}" is not part of the sudo or normal maintainer list.`,
	SHARED_INVALID_MODE: (mode, command) => `"${mode}" is an invalid mode for command ${command}`,

	// Action-related
	MISSING_ACTION_TYPE: `You forgot to specify a type!`,

	// Modlog
	INVALID_MODLOG_CHANNEL: channel => `"${channel}" is an invalid modlog channel!`,
	MISSING_MODLOG_CHANNEL: `This server doesn't have a configured modlog channel`,
	MODLOG_ENTRY_NOT_FOUND: id => `ModLog entry with case ID "${id}" was not found!`,

	// Child Process stuff
	CHILD_PROCESS_TYPE_INVALID: type => `"${type}" is an invalid child process type!`,
	CHILD_PROCESS_MISSING_PROPERTY: prop => `${prop} is missing from the chosen child process function!`,

	// Errors related to certain Worker errors
};

for (const [name, message] of Object.entries(Messages)) register(name, message);
