/* eslint-disable max-len */
const defaultRSSFeeds = require("../Configurations/rss_feeds.json");
const defaultTags = require("../Configurations/tags.json");
const defaultRanksList = require("../Configurations/ranks.json");
const defStatusMessages = require("../Configurations/status_messages.json");
const defTagReactions = require("../Configurations/tag_reactions.json");
const Utils = require("./Utils/");

// Set defaults for new server document
module.exports = async (bot, server, serverDocument) => {
	// Default admin roles
	server.roles.forEach(role => {
		if (role.name !== "@everyone" && !role.managed && role.permissions.has("MANAGE_GUILD", true) && !serverDocument.config.admins.id(role.id)) {
			serverDocument.config.admins.push({
				_id: role.id,
				level: 3,
			});
		}
	});

	// Default RSS feed
	serverDocument.config.rss_feeds = defaultRSSFeeds;

	// Default tag list
	serverDocument.config.tags.list = defaultTags;

	// Default ranks list
	serverDocument.config.ranks_list = defaultRanksList;

	// Default member messages
	serverDocument.config.moderation.status_messages.new_member_message.messages = defStatusMessages.new_member_message;
	serverDocument.config.moderation.status_messages.member_online_message.messages = defStatusMessages.member_online_message;
	serverDocument.config.moderation.status_messages.member_offline_message.messages = defStatusMessages.member_offline_message;
	serverDocument.config.moderation.status_messages.member_removed_message.messages = defStatusMessages.member_removed_message;
	serverDocument.config.moderation.status_messages.member_banned_message.messages = defStatusMessages.member_banned_message;
	serverDocument.config.moderation.status_messages.member_unbanned_message.messages = defStatusMessages.member_unbanned_message;

	// Default tag reactions
	serverDocument.config.tag_reaction.messages = defTagReactions;

	let guildCount = await Utils.GetValue(bot, "guilds.size", "int");
	// Send message to server owner about GAwesomeBot
	await bot.messageBotAdmins(server, serverDocument, {
		embed: {
			color: 0x43B581,
			title: `Hello! ${bot.user.tag} (that's me) has been added to "${server}", a server you moderate!`,
			description: `Use \`${bot.getCommandPrefix(server, serverDocument)}help\` to learn more, or check out https://gawesomebot.com/ 🙂 🎉`,
			footer: {
				text: `${guildCount % 1000 === 0 ? `*Wow, you're server #${guildCount} for me!* 🎉` : ""}`,
			},
		},
	});

	return serverDocument;
};
