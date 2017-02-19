const default_rss_feeds = require("./../Configuration/rss_feeds.json");
const default_tags = require("./../Configuration/tags.json");
const default_ranks_list = require("./../Configuration/ranks.json");
const default_status_messages = require("./../Configuration/status_messages.json");
const default_tag_reaction_messages = require("./../Configuration/tag_reaction.json");

// Set defaults for new server document
module.exports = (bot, svr, serverDocument) => {
	// Default admin roles
	svr.roles.forEach(role => {
		if(role.name!="@everyone" && !role.managed && role.permissions.has("manageGuild") && !serverDocument.config.admins.id(role.id)) {
			serverDocument.config.admins.push({
				_id: role.id,
				level: 3
			});
		}
	});

	// Default RSS feed
	serverDocument.config.rss_feeds = default_rss_feeds;

	// Default tag list
	serverDocument.config.tags.list = default_tags;

	// Default ranks list
	serverDocument.config.ranks_list = default_ranks_list;

	// Default member messages
	serverDocument.config.moderation.status_messages.new_member_message.messages = default_status_messages.new_member_message;
	serverDocument.config.moderation.status_messages.member_online_message.messages = default_status_messages.member_online_message;
	serverDocument.config.moderation.status_messages.member_offline_message.messages = default_status_messages.member_offline_message;
	serverDocument.config.moderation.status_messages.member_removed_message.messages = default_status_messages.member_removed_message;
	serverDocument.config.moderation.status_messages.member_banned_message.messages = default_status_messages.member_banned_message;
	serverDocument.config.moderation.status_messages.member_unbanned_message.messages = default_status_messages.member_unbanned_message;

	// Default tag reactions
	serverDocument.config.tag_reaction.messages = default_tag_reaction_messages;

	// Send message to server owner about AwesomeBot
	// TODO: uncomment this after testing
	//bot.messageBotAdmins(svr, serverDocument, "Hello! " + bot.user.username + " (that's me) has been added to " + svr.name + ", a server you moderate! " + (bot.guilds.size % 1000==0 ? ("*Wow, you're server #" + bot.guilds.size + " for me!* ") : "") + "Use `" + bot.getCommandPrefix(svr, serverDocument) + "help` to learn more or check out https://awesomebot.xyz/ :slight_smile: :tada:");

	return serverDocument;
};
