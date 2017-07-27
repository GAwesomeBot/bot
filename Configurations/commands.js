const commands = {
	pm: {
		afk: {
			usage: `<"." or message>`,
		},
		giveaway: {
			usage: "<server> | <channel>",
		},
		help: {
			usage: `[<command>]`,
		},
		join: {
			usage: ``,
		},
		poll: {
			usage: `<server> | <channel>`,
		},
		profile: {
			usage: `["setup" or <field>][ | "." or <value>],`,
		},
		reload: {
			usage: `<pm or public>.<command>`,
		},
		remindme: {
			usage: `<time from now> | <reminder>`,
		},
		say: {
			usage: `<server> | <channel>`,
		},
		servernick: {
			usage: `[<nick>] [ | <server>]`,
		},
	},
	public: {
		"8ball": {
			usage: `<question>`,
			description: `Predicts the answer to a question`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Fun 🎪`,
		},
		about: {
			usage: `[<suggestion> or <bug>]`,
			description: `Information about GAwesomeBot`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `GAwesomeBot 🤖`,
		},
		afk: {
			usage: `[<"."> or <message>]`,
			description: `Display an AFK message for the user when tagged`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
		},
		alert: {
			usage: `[<message>]`,
			description: `Allows members to message all the server admins`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Moderation ⚒`,
		},
		anime: {
			usage: `<query> [<limit>]`,
			description: `Searches Anime Shows using Kitsu.io`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Search & Media 🎬`,
		},
		appstore: {
			usage: `<query>`,
			description: `Searches the Apple App Store for one or more apps`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Search & Media 🎬`,
		},
		archive: {
			usage: `<count>`,
			description: `Provides a JSON file with the last \`n\` messages in chat`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
		},
		avatar: {
			usage: `[<user mention>]`,
			description: `Shows a user's profile picture`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
		},
		ban: {
			usage: `<user>[ | <reason>]`,
			description: `Bans the user from this server and deletes 1 day's worth of messages.`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 3,
			},
			category: `Moderation ⚒`,
		},
		calc: {
			usage: `<expression>`,
			description: `Quickly evaluate a mathematical expression`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
		},
		cat: {
			usage: ``,
			description: `Random picture of a cat!`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Fun 🎪`,
		},
		catfact: {
			usage: `[<number of facts>]`,
			description: `Random fact(s) about cats!`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Fun 🎪`,
		},
		choose: {
			usage: `<option 1>|<option 2>[|...]`,
			description: `Randomly chooses from a set of options`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
		},
		cool: {
			usage: `[<"." or cooldown length][|<cooldown duration>]`,
			description: `Sets a command cooldown for the channel`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 1,
			},
			category: `Moderation ⚒`,
		},
		count: {
			usage: `<name>[| "." or "+1" or +-1]`,
			description: `Keep tallies of various things`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
		},
		countdown: {
			usage: `[<event>][|<time from now>]`,
			description: `Set a countdown for an event`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
		},
		debug: {
			usage: `[<"-v">]`,
			description: `Provides information about the bot, optionally, some system architecture information`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `GAwesomeBot 🤖`,
		},
		disable: {
			usage: `[<command> <command>...]`,
			description: `Turns off a command or commands in the channel`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 3,
			},
			category: `Moderation ⚒`,
		},
		dog: {
			usage: ``,
			description: `Random picture of a dog!`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Fun 🎪`,
		},
		doge: {
			usage: ``,
			description: `Random picture of a doge, kindly provided by tinytaco#7999`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Fun 🎪`,
		},
		dogfact: {
			usage: `[<number>]`,
			description: `Random fact(s) about dogs!`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Fun 🎪`,
		},
		e621: {
			usage: `<query> [<limit>]`,
			description: `Searches by tag on e621.net`,
			defaults: {
				isEnabled: false,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `NSFW 👹`,
		},
		emoji: {
			usage: `<custom emoji> or <Twetmoji>`,
			description: `Provides a jumbo variant of the chosen emoji`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
		},
		emotes: {
			usage: ``,
			description: `Shows the current emojis on the server`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
		},
		enable: {
			usage: `[<command> <command>...]`,
			description: `Turns on a command or multiple commands in the channel`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 3,
			},
			category: `Moderation ⚒`,
		},
		eval: {
			usage: `<expression>`,
			description: `Evaluates something`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 4,
			},
			category: `GAwesomeBot 🤖`,
		},
		fortune: {
			usage: `[<category>]`,
			description: `Tells your fortune (not really)`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Fun 🎪`,
		},
		games: {
			usage: ``,
			description: `Command that shows the top 10 most-played games by members on the server`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Stats & Points ⭐️`,
		},
		gif: {
			usage: `<query>`,
			description: `Gets a GIF from Giphy with the given tag(s)`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: true,
				adminLevel: 0,
			},
			category: `Search & Media 🎬`,
		},
		giveaway: {
			usage: `["enroll" or "join"]`,
			description: `Easy way to randomly give away a secret of sort`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
			adminExempt: true,
		},
		google: {
			usage: `<query> [<limit>]`,
			description: `Displays Google Search and Knowledge Graph results`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: true,
				adminLevel: 0,
			},
			category: `Search & Media 🎬`,
		},
		help: {
			usage: `[<command>]`,
			description: `Displays help information about what command(s) and extensions you can run`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `GAwesomeBot 🤖`,
		},
		image: {
			usage: `<query> ["random"]`,
			description: `Searches Google Images with the given query and returns the first or a random result`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: true,
				adminLevel: 0,
			},
			category: `Search & Media 🎬`,
		},
		imdb: {
			usage: `[<type>] <query>`,
			description: `Provides movie and TV show data`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Search & Media 🎬`,
		},
		imgur: {
			usage: `<image attachment> or <image URL>`,
			description: `Uploads an image or images to Imgur`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
		},
		info: {
			usage: ``,
			description: `Lists basic stats about this server`,
			defaults: {
				isEnabled: true,
				isNSFWFiltered: false,
				adminLevel: 0,
			},
			category: `Utility 🔦`,
		},

	},
};

module.exports = commands;
