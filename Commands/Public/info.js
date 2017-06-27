const moment = require("moment");

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	const prefix = bot.getCommandPrefix(msg.channel.guild, serverDocument);
	msg.channel.createMessage({
		embed: {
			color: 0x00FF00,
			author: {
				name: `${msg.channel.guild.name} (${msg.channel.guild.id})`,
				url: `${config.hosting_url}activity/servers?q=${encodeURIComponent(msg.channel.guild.name)}`,
			},
			footer: {
				text: `The command prefix here is "${prefix}", use "${prefix}help" to see what commands you can use.`,
			},
			thumbnail: {
				url: msg.channel.guild.iconURL ? msg.channel.guild.iconURL : "",
			},
			description: `**Shard:** ${msg.channel.guild.shard.id + 1}`,
			fields: [
				{
					name: `\u200B`,
					value: `Created ${moment(msg.channel.guild.createdAt).fromNow()}`,
					inline: true,
				},
				{
					name: `\u200B`,
					value: `Owned by ${msg.channel.guild.members.get(msg.channel.guild.ownerID).tag}`,
					inline: true,
				},
				{
					name: `\u200B`,
					value: `With ${msg.channel.guild.members.size} members`,
					inline: true,
				},
				{
					name: `\u200B`,
					value: `There have been ${serverDocument.messages_today} message${serverDocument.messages_today > 1 ? "s" : ""} today`,
					inline: true,
				},
				{
					name: `\u200B`,
					value: `This servers category is \`${serverDocument.config.public_data.server_listing.category}\``,
					inline: true,
				},
				{
					name: `\u200B`,
					value: serverDocument.config.public_data.server_listing.isEnabled ? `Click [here](${serverDocument.config.public_data.server_listing.invite_link}) to join this server` : "There isn't a public invite to this place..",
					inline: true,
				},
				{
					name: `\u200B`,
					value: `Click on the title to see the guilds webpage`,
					inline: true,
				},
			],
		},
	});
};
