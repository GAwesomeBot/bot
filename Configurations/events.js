module.exports = {
	/**
	 * The keys represent the event name
	 * The values represent the event file names that will be ran once any event happen.
	 * Read more on the discord.js page: https://discord.js.org/#/docs/main/master/class/Client
	 * !!! DO NOT ADD .js AT THE END OF THE NAME !!!
	 * @type {string[]}
	 */
	rateLimit: [

	],
	ready: [
		"GAB.Ready",
	],
	resumed: [

	],
	guildCreate: [
		"GAB.GuildCreate",
	],
	guildDelete: [
		"GAB.GuildDelete",
	],
	guildUpdate: [

	],
	guildUnavailable: [

	],
	guildAvailable: [

	],
	guildMemberAdd: [
		"GAB.GuildMemberAdd",
	],
	guildMemberRemove: [

	],
	guildMemberUpdate: [

	],
	guildMemberAvailable: [

	],
	guildMemberSpeaking: [

	],
	guildMembersChunk: [

	],
	roleCreate: [

	],
	roleDelete: [

	],
	roleUpdate: [

	],
	emojiCreate: [

	],
	emojiDelete: [

	],
	emojiUpdate: [

	],
	guildBanAdd: [

	],
	guildBanRemove: [

	],
	channelCreate: [

	],
	channelDelete: [

	],
	channelUpdate: [

	],
	channelPinsUpdate: [

	],
	message: [
		"GAB.MessageCreate",
		"GAB.SpamHandler",
		"GAB.VoteHandler",
		"GAB.AFKHandler",
		"GAB.UsernameHandler",
		"GAB.SharedCommandMessageHandler",
		// "GAB.Translation",
		// "GAB.OtherFilters",
	],
	messageDelete: [

	],
	messageUpdate: [

	],
	messageDeleteBulk: [

	],
	messageReactionAdd: [

	],
	messageReactionRemove: [

	],
	messageReactionRemoveAll: [

	],
	userUpdate: [

	],
	presenceUpdate: [

	],
	voiceStateUpdate: [

	],
	disconnect: [

	],
	error: [

	],
	warn: [

	],
	debug: [

	],
};
