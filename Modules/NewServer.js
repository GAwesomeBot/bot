/* eslint-disable max-len */
const defaultRSSFeeds = require("../Configurations/rss_feeds.json");
const defaultTags = require("../Configurations/tags.json");
const defaultRanksList = require("../Configurations/ranks.json");
const defStatusMessages = require("../Configurations/status_messages.json");
const defTagReactions = require("../Configurations/tag_reactions.json");
const Utils = require("./Utils/");

// Set defaults for new server document
module.exports = async (client, server, serverDocument) => {
	const serverConfigQueryDocument = serverDocument.query.prop("config");
	// Default admin roles
	server.roles.forEach(role => {
		if (role.name !== "@everyone" && !role.managed && role.permissions.has("MANAGE_GUILD", true) && !serverDocument.config.admins.id(role.id)) {
			serverConfigQueryDocument.push("admins", {
				_id: role.id,
				level: 3,
			});
		}
	});

	// Default RSS feed
	serverConfigQueryDocument.set("rss_feeds", defaultRSSFeeds);

	// Default tag list
	serverConfigQueryDocument.set("tags.list", defaultTags);

	// Default ranks list
	serverConfigQueryDocument.set("ranks_list", defaultRanksList);

	// Default member messages
	serverConfigQueryDocument.set("moderation.status_messages.new_member_message.messages", defStatusMessages.new_member_message)
		.set("moderation.status_messages.member_online_message.messages", defStatusMessages.member_online_message)
		.set("moderation.status_messages.member_offline_message.messages", defStatusMessages.member_offline_message)
		.set("moderation.status_messages.member_removed_message.messages", defStatusMessages.member_removed_message)
		.set("moderation.status_messages.member_banned_message.messages", defStatusMessages.member_banned_message)
		.set("moderation.status_messages.member_unbanned_message.messages", defStatusMessages.member_unbanned_message);

	// Default tag reactions
	serverConfigQueryDocument.set("tag_reaction.messages", defTagReactions);

	const guildCount = await Utils.GetValue(client, "guilds.size", "int");
	// Send message to server owner about GAwesomeBot
	await client.messageBotAdmins(server, serverDocument, {
		embed: {
			color: 0x43B581,
			title: `Hello! ${client.user.tag} (that's me) has been added to "${server}", a server you moderate!`,
			description: `Use \`${client.getCommandPrefix(server, serverDocument)}help\` to learn more, or check out https://gawesomebot.com/ 🙂 🎉`,
			footer: {
				text: `${guildCount % 1000 === 0 ? `*Wow, you're server #${guildCount} for me!* 🎉` : ""}`,
			},
		},
	});

	return serverDocument;
};
