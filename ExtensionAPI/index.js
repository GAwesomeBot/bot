const PATHS = exports.PATHS = {
	Channels: file => require(`./Channels/${file}`),
	Guilds: file => require(`./Guilds/${file}`),
	Messages: file => require(`./Messages/${file}`),
	Misc: file => require(`./Misc/${file}`),
	Utils: file => require(`./Utils/${file === "Utils" ? `${file}.js` : ""}`),
};

module.exports = {
	// Channels
	GuildChannel: PATHS.Channels("GuildChannel"),
	VoiceChannel: PATHS.Channels("VoiceChannel"),
	TextChannel: PATHS.Channels("TextChannel"),

	// Guild Stuff
	Guild: PATHS.Guilds("Guild"),
	GuildMember: PATHS.Guilds("GuildMember"),
	Member: module.exports.GuildMember,
	Role: PATHS.Guilds("Role"),

	// Messages
	Message: PATHS.Messages("Message"),
	MessageMentions: PATHS.Messages("MessageMentions"),
	MessageReaction: PATHS.Messages("MessageReaction"),

	// Misc
	Emoji: PATHS.Misc("Emoji"),
	Invite: PATHS.Misc("Invite"),
	PermissionOverwrites: PATHS.Misc("PermissionOverwrites"),
	ReactionEmoji: PATHS.Misc("ReactionEmoji"),

	// Utils:
	Embed: PATHS.Utils("Embed"),
	Utils: PATHS.Utils("Utils"),

	// Other stuff
	Bot: require("./Bot"),
	User: require("./User"),
};
