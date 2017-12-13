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

	// Shared Command related
	UNAUTHORIZED_USER: user => `"${user.tag}" is not part of the sudo or normal maintainer list.`,
	SHARED_INVALID_MODE: (mode, command) => `"${mode}" is an invalid mode for command ${command}`,
};

for (const [name, message] of Object.entries(Messages)) register(name, message);
