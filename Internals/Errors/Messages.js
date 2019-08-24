const { register } = require("./GABError");

const Messages = {
	// Class-related
	STATIC_CLASS: name => `The ${name} class should not be instantiated!`,
	NON_OVERWRITTEN: prop => `The ${prop} function has not been overwritten!`,

	// Event Related
	UNKNOWN_EVENT: event => `Unknown event received: ${event}`,
	NO_HANDLE: event => `${event} doesn't have the handle method overwritten!`,

	// Discord.js
	UNKNOWN_DISCORD_ERROR: error => `An unknown Discord error occurred: ${error.stack}`,
	UNKNOWN_DISCORD_API_ERROR: error => `An unknown Discord API error occurred: ${error.stack}`,

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

	// Errors related to Extension Faults
	UNKNOWN_MODULE: module => `${module} is not a valid GAwesomeScript module`,
	MISSING_SCOPES: module => module ? `Your extension did not register sufficient scopes to require module ${module}` : `Your extension did not register sufficient scopes to perform this action`,
	STORAGE_MAX_SIZE: `Extension Storage has reached its maximum size`,
	STORAGE_EMPTY: `The Extension Storage is empty!`,
	DISCORD_ERROR: err => err.message,
	API_ERROR: msg => msg,

	MISSING_GIPHY_QUERY: `You need to provide a query for Giphy!`,
	NO_GIPHY_RESULT: `There were to Giphy results for your query!`,

	// Central returned an unsupported apiVersion.
	OUTDATED_CENTRAL_SPEC_VERSION: `GAwesomeBot is too outdated to perform that action.`,

	CENTRAL_ERROR: (status, error) => `Central returned a ${status} response${error ? `: ${error}` : ""}.`,
	CENTRAL_DOWNLOAD_ERROR: status => `Version download request failed with code ${status}.`,
	CENTRAL_VERSION_NOT_DOWNLOADED: `Version requested for install has not been downloaded.`,
	PATCH_CORRUPTED: patch => `Patch ${patch} failed verification and is corrupted.`,

	// Database Faults
	MONGODB_ERROR: err => `An unknown error occurred while interacting with MongoDB: ${err}`,
	GADRIVER_ERROR: err => `An unknown error occurred within GADriver: ${err}`,
	GADRIVER_INVALID_PARAMS: `A GADriver method was executed with insufficient or invalid parameters.`,
};

for (const [name, message] of Object.entries(Messages)) register(name, message);
