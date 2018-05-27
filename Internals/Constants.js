/* eslint node/exports-style: ["error", "exports"] */

exports.ModLogEntries = {
	ADD_ROLE: "Add Role",
	CREATE_ROLE: "Create Role",
	REMOVE_ROLE: "Remove Role",
	DELETE_ROLE: "Delete Role",
	MODIFY_ROLE: "Modify Role",

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

	TWITCH: 0x6441A5,
	YOUTUBE: 0xFF0000,
};

// Should all be functions for consistency, even if the string is hardcoded.
exports.Text = {
	COMMAND_ERR: () => "Something went wrong! 😱",
	INVALID_USAGE: (commandData, prefix = null) => `🗯 Correct usage is: \`${prefix ? prefix : ""}${commandData.name} ${commandData.usage}\``,
	MISSING_PERMS: serverName => `🔐 You don't have permission to use this command${serverName ? ` on ${serverName}` : "."}`,
	NSFW_INVALID: () => `You need to give me something to search for! ( ͡° ͜ʖ ͡° )`,
	INVITE: client => ({
		embed: {
			color: exports.Colors.LIGHT_GREEN,
			title: `Thanks for choosing me! 😊`,
			description: [
				`To add me, follow [this URL](${configJS.oauthLink.format({ id: client.user.id })})`,
				"",
				"The above link contains all permissions that are required to be able to run any of my commands.",
				"We know that not all permissions are right for each server, so feel free to uncheck some boxes.",
				"We'll let you know if we're missing any permissions for running certain commands!",
				"",
				// eslint-disable-next-line max-len
				"For the best experience with me, please make sure I have at least `Send Messages`, `Embed Links`, `Add Reactions` and `Manage Messages`! That way you'll be able to use most of my features right away!",
			].join("\n"),
		},
	}),
	GUILD_VERIFICATION_LEVEL: level => exports.GUILD_VERIFICATION_LEVELS[level],
};

exports.GUILD_VERIFICATION_LEVELS = [
	"None",
	"Low - must have verified email on account",
	"Medium - must be registered on Discord for longer than 5 minutes",
	"High - (╯°□°）╯︵ ┻━┻ - must be a member of the server for longer than 10 minutes",
	"Very High - ┻━┻ミヽ(ಠ益ಠ)ﾉ彡┻━┻ - must have a verified phone number",
];

// Hardcoded names for the child process manager
exports.WorkerTypes = {
	MATH: "mathjs",
	EMOJI: "emoji",
};

exports.WorkerCommands = {
	MATHJS: {
		EVAL: "eval",
		HELP: "help",
	},
};

exports.WorkerEvents = {
	RUN_MATH: "runMathCommand",
	JUMBO_EMOJI: "jumboEmoji",
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

/**
 * Emojis that are used in the help menu, each representing:
 * ℹ -- Main menu
 * 🤖 -- GAB commands, like ping
 * 🎪 -- Fun commands
 * ⚒ -- ~~Communism~~ Moderation
 * 🎬 -- Sarch and Media
 * 👹 -- NSFW
 * ⭐️ -- Stats and points (and starboard 👀)
 * 🔦 -- Utility commands
 * ⚙️ -- Extension Commands
 */
exports.HelpMenuEmojis = {
	info: "ℹ",
	gab: "🤖",
	fun: "🎪",
	mod: "⚒",
	media: "🎬",
	nsfw: "👹",
	stats: "⭐",
	util: "🔦",
	extension: "⚙",
};

/**
 * I was super lazy to do if-checks so I did this instead.
 * Sorry. -- Vlad
 */
exports.CategoryEmojiMap = {
	"Extensions ⚙️": "⚙",
	"Fun 🎪": "🎪",
	"GAwesomeBot 🤖": "🤖",
	"Moderation ⚒": "⚒",
	"NSFW 👹": "👹",
	"Search & Media 🎬": "🎬",
	"Stats & Points ⭐️": "⭐",
	"Utility 🔦": "🔦",
};

exports.Templates = {
	ReactionMenu: {
		title: `Choose a number`,
		color: exports.Colors.BLUE,
		description: `{list}`,
		footer: `Page {current} out of {total}`,
	},
	StreamingTemplate: data => {
		const color = exports.Colors[data.type.toUpperCase()] || exports.Colors.INFO;
		return {
			embed: {
				color,
				description: `${data.name} started streaming \`${data.game}\` on **${data.type}**\nWatch them by clicking [**here**](${data.url})\n\nHere is a preview of the stream:`,
				author: {
					name: data.name,
					iconURL: data.streamerImage,
					url: data.url,
				},
				image: {
					url: data.preview,
				},
			},
		};
	},
};

exports.APIs = {
	ANIME: filter => `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(filter)}`,
	CATFACT: number => `https://catfact.ninja/facts?limit=${number}`,
	DOGFACT: number => `https://dog-api.kinduff.com/api/facts?number=${number}`,
	E621: query => `https://e621.net/post/index.json?tags=${encodeURIComponent(query)}&limit=256`,
	FORTUNE: (category = null) => `http://yerkee.com/api/fortune/${category ? category : ""}`,
	GIPHY: (token, query, nsfw) => `http://api.giphy.com/v1/gifs/random?api_key=${token}&rating=${nsfw}&format=json&limit=1&tag=${encodeURIComponent(query)}`,
	REDDIT: subreddit => `https://www.reddit.com/r/${subreddit}.json`,
	SPOOPYLINK: url => `https://spoopy.link/api/${url}`,
	URBAN: (term, page = 1) => `https://api.urbandictionary.com/v0/${!term ? "random" : `define?page=${page}&term=${encodeURIComponent(term)}`}`,
};

exports.EmptySpace = `\u200b`;

exports.Perms = {
	eval: "⚙ Evaluation (Can execute `eval`)",
	sudo: "🛡 Sudo Mode (Can act as a Server Admin)",
	management: "🔧 Management (Can access management)",
	administration: "🗂 Administration (Can manage the Bot User)",
	shutdown: "🌟 Shutdown (Can manage GAB Processes)",
};

// Events that can be used to create event extensions. D.js events that are not in this list will be disabled on the worker process
exports.AllowedEvents = [
	"channelCreate",
	"channelDelete",
	"channelUpdate",
	"channelPinsUpdate",
	"emojiCreate",
	"emojiDelete",
	"emojiUpdate",
	"guildBanAdd",
	"guildBanRemove",
	"guildMemberAdd",
	"guildMemberRemove",
	"guildMemberSpeaking",
	"guildMemberUpdate",
	"guildUpdate",
	"messageDelete",
	"messageDeleteBulk",
	"messageReactionAdd",
	"messageReactionRemove",
	"messageReactionRemoveAll",
	"messageUpdate",
	"roleCreate",
	"roleDelete",
	"roleUpdate",
	"voiceStateUpdate",
];

// Embed object for NSFW commands
exports.NSFWEmbed = {
	embed: {
		color: exports.Colors.SOFT_ERR,
		title: `I'm sorry, but I can't let you do that! 🙄`,
		description: `You'll have to run this command in a channel that is marked **NSFW**!`,
		footer: {
			text: `Ask an Admin to edit this channel and make it NSFW. Then you can use this command as much as you like`,
		},
	},
};

exports.APIResponses = {
	servers: {
		success: data => ({ err: null, data }),
		notFound: () => ({ err: "Server not found", data: null }),
	},
	users: {
		success: data => ({ err: null, data }),
		badRequest: () => ({ err: "Request is invalid", data: null }),
		notFound: () => ({ err: "User not found", data: null }),
		internalError: () => ({ err: "Internal server error", data: null }),
	},
	extensions: {
		success: data => ({ err: null, data }),
		notFound: () => ({ err: "No extensions were found", data: null }),
		internalError: () => ({ err: "Internal server error", data: null }),
	},
};

// Categories for the fortune command
exports.FortuneCategories = [
	"all",
	"computers",
	"cookie",
	"definitions",
	"miscellaneous",
	"people",
	"platitudes",
	"politics",
	"science",
	"wisdom",
];

exports.EightBall = {
	WaitTimes: [1000, 1500, 3000, 2500, 2000, 1250, 500, 300, 100, 600],
	Answers: [
		{
			color: 0x43B581,
			answer: "It is certain",
		},
		{
			color: 0x43B581,
			answer: "It is decidedly so",
		},
		{
			color: 0x43B581,
			answer: "Without a doubt",
		},
		{
			color: 0x43B581,
			answer: "Yes, definitely",
		},
		{
			color: 0x43B581,
			answer: "You may rely on it",
		},
		{
			color: 0x43B581,
			answer: "As I see it, yes",
		},
		{
			color: 0x43B581,
			answer: "Most likely",
		},
		{
			color: 0x43B581,
			answer: "Outlook good",
		},
		{
			color: 0x43B581,
			answer: "Yes",
		},
		{
			color: 0x43B581,
			answer: "Signs point to yes",
		},
		{
			color: 0xE55B0A,
			answer: "Reply hazy try again",
		},
		{
			color: 0xE55B0A,
			answer: "Ask again later",
		},
		{
			color: 0xE55B0A,
			answer: "Better not tell you now",
		},
		{
			color: 0xE55B0A,
			answer: "Cannot predict now",
		},
		{
			color: 0xE55B0A,
			answer: "Concentrate and ask again",
		},
		{
			color: 0xCC0F16,
			answer: "Don't count on it",
		},
		{
			color: 0xCC0F16,
			answer: "My reply is no",
		},
		{
			color: 0xCC0F16,
			answer: "My sources say no",
		},
		{
			color: 0xCC0F16,
			answer: "Outlook not so good",
		},
		{
			color: 0xCC0F16,
			answer: "Very doubtful",
		},
	],
};

/**
 * Past this line there can be snippets of code under specific licenses
 * The license will be specified above each item, if applicable
 */

exports.EmojiRegex = {
	Text: /:.*?:/,
	SkinToneText: /:(.*?)::skin-tone-([1-5]):/,
	UnicodeSkinTone: /:(.*?):(🏻|🏼|🏽|🏾|🏿)/,
	// eslint-disable-next-line max-len
	MobileSkinTone: new RegExp("(\u{261D}|\u{26F9}|\u{270A}|\u{270B}|\u{270C}|\u{270D}|\u{1F385}|\u{1F3C3}|\u{1F3C4}|\u{1F3CA}|\u{1F3CB}|\u{1F442}|\u{1F443}|\u{1F446}|\u{1F447}|\u{1F448}|\u{1F449}|\u{1F44A}|\u{1F44B}|\u{1F44C}|\u{1F44D}|\u{1F44E}|\u{1F44F}|\u{1F450}|\u{1F466}|\u{1F467}|\u{1F468}|\u{1F469}|\u{1F46E}|\u{1F470}|\u{1F471}|\u{1F472}|\u{1F473}|\u{1F474}|\u{1F475}|\u{1F476}|\u{1F477}|\u{1F478}|\u{1F47C}|\u{1F481}|\u{1F482}|\u{1F483}|\u{1F485}|\u{1F486}|\u{1F487}|\u{1F4AA}|\u{1F575}|\u{1F57A}|\u{1F590}|\u{1F595}|\u{1F596}|\u{1F645}|\u{1F646}|\u{1F647}|\u{1F64B}|\u{1F64C}|\u{1F64D}|\u{1F64E}|\u{1F64F}|\u{1F6A3}|\u{1F6B4}|\u{1F6B5}|\u{1F6B6}|\u{1F6C0}|\u{1F918}|\u{1F919}|\u{1F91A}|\u{1F91B}|\u{1F91C}|\u{1F91D}|\u{1F91E}|\u{1F926}|\u{1F930}|\u{1F933}|\u{1F934}|\u{1F935}|\u{1F936}|\u{1F937}|\u{1F938}|\u{1F939}|\u{1F93C}|\u{1F93D}|\u{1F93E}):skin-tone-([1-5]):"),
};
