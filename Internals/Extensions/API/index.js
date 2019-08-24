/**
 * The GAB Extension Code API.
 * @namespace API
 */
module.exports = {
	Client: require("./Modules/Client"),
	Message: require("./Structures/Message"),
	User: require("./Structures/User"),
	Guild: require("./Structures/Guild"),
	Channel: require("./Structures/Channel"),
	Member: require("./Structures/Member"),
	Emoji: require("./Structures/Emoji"),
	Embed: require("./Structures/Embed"),

	Extension: require("./Modules/Extension"),
	ScopeManager: require("./Utils/ScopeManager"),
};
