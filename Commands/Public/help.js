const HelpMenu = require("../../Modules/MessageUtils/ReactionMenus/HelpMenu");

const getCommandHelp = (name, type, usage, description) => [
	`» ${type} Command **::** **${name}** «`,
	type !== "PM" ? `\t**Description**: ${description || "No description provided."}` : null,
	`\t**Usage**: \`${usage || "No usage information provided."}\``,
	type === "public" ? `\tClick [**here**](https://github.com/GilbertGobbels/GAwesomeBot/wiki/Commands#${name}) for more info.` : null,
].spliceNullElements().join("\n");

module.exports = async ({ client, Constants: { Colors, CategoryEmojiMap, HelpMenuEmojis } }, { serverDocument }, msg, commandData) => {
	if (msg.suffix) {
		const description = [];
		const [pmCmd, publicCmd, sharedCmd] = [client.getPMCommandMetadata(msg.suffix), client.getPublicCommandMetadata(msg.suffix), client.getSharedCommandMetadata(msg.suffix)];
		pmCmd && description.push(getCommandHelp(pmCmd.command, "PM", pmCmd.usage, pmCmd.description));
		publicCmd && description.push(getCommandHelp(publicCmd.command, "Public", publicCmd.usage, publicCmd.description));
		sharedCmd && description.push(getCommandHelp(sharedCmd.command, "Shared", sharedCmd.usage, sharedCmd.description));
		if (serverDocument.extensions.length) {
			for (const extension of serverDocument.extensions) {
				if (extension.type === "command" && msg.suffix.trim().toLowerCase() === extension.key) {
					const extensionDocument = await Gallery.findOneByObjectID(extension._id);
					const versionDocument = extensionDocument.versions.id(extension.version);
					description.push(getCommandHelp(extension.key, "Extension", versionDocument.usage_help, versionDocument.extended_help));
					// We won't add any more extensions with the same key
					// If you have two or more of them, you're doing it wrong!
					break;
				}
			}
		}
		description.length === 0 && description.push(`I'm unable to find any command called \`${msg.suffix.trim().toLowerCase()}\`!`);
		return msg.send({
			embed: {
				color: Colors.INFO,
				description: description.join("\n\n"),
				footer: {
					text: `Not what you're looking for? Run "${msg.guild.commandPrefix}help" to see all commands you can run!`,
				},
			},
		});
	}

	const commands = { "Extensions ⚙️": [] };
	commands["Extensions ⚙️"].temp = [];
	const pages = {};
	const memberBotAdminLevel = client.getUserBotAdmin(msg.guild, serverDocument, msg.member);
	let longest = 0;
	for (const command of client.getPublicCommandList()) {
		const cmdData = client.getPublicCommandMetadata(command);
		if (!commands[cmdData.category]) {
			commands[cmdData.category] = [];
			commands[cmdData.category].temp = [];
		}
		if (serverDocument.config.commands[command] && serverDocument.config.commands[command].isEnabled && memberBotAdminLevel >= serverDocument.config.commands[command].admin_level && !serverDocument.config.commands[command].disabled_channel_ids.includes(msg.channel.id)) {
			const string = `${msg.guild.commandPrefix}${cmdData.command}`;
			if (string.length > longest) longest = string.length;
			commands[cmdData.category].temp.push([string, cmdData.usage || "No usage help provided."]);
		}
	}

	if (serverDocument.extensions.length) {
		for (const extension of serverDocument.extensions) {
			if (memberBotAdminLevel >= extension.admin_level) {
				const string = `${msg.guild.commandPrefix}${extension.key}`;
				if (string.length > longest) longest = string.length;
				const extensionDocument = await Gallery.findOneByObjectID(extension._id);
				const versionDocument = extensionDocument.versions.id(extension.version);
				commands["Extensions ⚙️"].temp.push([string, versionDocument.usage_help || "No usage help provided."]);
			}
		}
	}

	for (const category of Object.keys(commands)) {
		const { temp } = commands[category];
		if (temp.length) {
			for (const [cmdKey, usage] of temp) {
				commands[category].push(`${cmdKey.padEnd(longest)} | ${usage}`);
			}
		} else if (category !== "Extensions ⚙️") {
			commands[category].push(`== No Commands Enabled Here ==`);
		}
		pages[CategoryEmojiMap[category]] = commands[category].sort((a, b) => a.replace(msg.guild.commandPrefix, "").split(" ")[0].localeCompare(b.replace(msg.guild.commandPrefix, "").split(" ")[0])).join("\n");
	}

	new HelpMenu(msg, {
		embed: {
			color: Colors.INFO,
			author: {
				name: `Welcome to the GAwesomeBot help menu!`,
			},
			title: `This menu will show you all commands you can run!`,
			description: [
				`The prefix is shown in front of all commands, but in case you forgot, it is **${msg.guild.commandPrefix}**.`,
				`For more information about any command, run \`${msg.guild.commandPrefix}help <command>\`, or head over to our [**wiki**](https://github.com/GilbertGobbels/GAwesomeBot/wiki/Commands).`,
				`If you need support using GAwesomeBot or got any question, join our [**support server**](${configJS.discordLink})!`,
				``,
				`Click a button to see a list of all commands in that category. Here is what each emoji represents:`,
				``,
				`ℹ️ **--** This info page`,
				`🤖 **--** GAwesomeBot Commands`,
				`🎪 **--** Fun Commands`,
				`⚒ **--** Moderation Commands`,
				`🎬 **--** Search & Media Commands`,
				`👹 **--** NSFW Commands`,
				`⭐️ **--** Stats & Points Commands`,
				`🔦 **--** Utility Commands`,
				pages[HelpMenuEmojis.extension].length ? `⚙️ **--** Extension Commands` : null,
				``,
				`You can exit the menu by clicking the ⏹ button. Have fun! 😃🐬`,
			].spliceNullElements().join("\n"),
			footer: {
				text: `For a list of commands you can use in PMs with me, just PM me "help", and I'll let you know!`,
			},
		},
	}, {
		withExtensions: pages[HelpMenuEmojis.extension].length > 0,
		pages: {
			[HelpMenuEmojis.gab]: {
				embed: {
					color: Colors.LIGHT_GREEN,
					title: `GAwesomeBot 🤖`,
					description: `\`\`\`css\n${pages[HelpMenuEmojis.gab]}\`\`\``,
				},
			},
			[HelpMenuEmojis.fun]: {
				embed: {
					color: Colors.LIGHT_BLUE,
					title: `Fun 🎪`,
					description: `\`\`\`css\n${pages[HelpMenuEmojis.fun]}\`\`\``,
				},
			},
			[HelpMenuEmojis.mod]: {
				embed: {
					color: Colors.LIGHT_RED,
					title: `Moderation ⚒`,
					description: `\`\`\`css\n${pages[HelpMenuEmojis.mod]}\`\`\``,
				},
			},
			[HelpMenuEmojis.media]: {
				embed: {
					// Don't ask
					color: Colors.TRIVIA_START,
					title: `Search & Media 🎬`,
					description: `\`\`\`css\n${pages[HelpMenuEmojis.media]}\`\`\``,
				},
			},
			[HelpMenuEmojis.nsfw]: {
				embed: {
					color: Colors.LIGHT_ORANGE,
					title: `NSFW 👹`,
					description: `\`\`\`css\n${pages[HelpMenuEmojis.nsfw]}\`\`\``,
				},
			},
			[HelpMenuEmojis.stats]: {
				embed: {
					color: Colors.YELLOW,
					title: `Stats & Points ⭐️`,
					description: `\`\`\`css\n${pages[HelpMenuEmojis.stats]}\`\`\``,
				},
			},
			[HelpMenuEmojis.util]: {
				embed: {
					color: Colors.BLUE,
					title: `Utility 🔦`,
					description: `\`\`\`css\n${pages[HelpMenuEmojis.util]}\`\`\``,
				},
			},
			[HelpMenuEmojis.extension]: {
				embed: {
					color: Colors.GREEN,
					title: `Extensions ⚙️`,
					description: `\`\`\`css\n${pages[HelpMenuEmojis.extension]}\`\`\``,
				},
			},
		},
	}).init(240000);
};
