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

	// CLI errors
	CLI_PARAM_INVALID: (paramName, receivedType, allowedTypes) => {
		function mapTo (string) {
			if (typeof string !== "string") string = string.constructor.name;
			return string;
		}

		if (Array.isArray(allowedTypes)) {
			allowedTypes = allowedTypes.map(mapTo).join("|");
		}
		if (typeof allowedTypes !== "string") allowedTypes = mapTo(allowedTypes);
		return `Invalid type of "${paramName}" argument: should be ${allowedTypes}, passed ${receivedType}`;
	},
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
	// Errors related to Extension Faults
	UNKNOWN_MODULE: module => `${module} is not a valid GAwesomeScript module`,
	MISSING_SCOPES: module => module ? `Your extension did not register sufficient scopes to require module ${module}` : `Your extension did not register sufficient scopes to perform this action`,
	STORAGE_MAX_SIZE: `Extension Storage has reached it's maximum size`,
	STORAGE_EMPTY: `The Extension Storage is empty!`,
};

for (const [name, message] of Object.entries(Messages)) register(name, message);
