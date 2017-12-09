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
};

for (const [name, message] of Object.entries(Messages)) register(name, message);
