const moment = require("moment");

/* eslint-disable max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	const prefix = bot.getCommandPrefix(msg.channel.guild, serverDocument);
	const template = () => {
		const string = `
**»** Shard ${msg.channel.guild.shard.id + 1}
**»** Created ${moment(msg.channel.guild.createdAt).fromNow()}
**»** Owned by ${msg.channel.guild.members.get(msg.channel.guild.ownerID).tag}
**»** With ${msg.channel.guild.members.size} members, ${msg.channel.guild.channels.size} channels and ${msg.channel.guild.roles.size} roles
**»** There have been ${serverDocument.messages_today} message${serverDocument.messages_today !== 1 ? "s" : ""} today
**»** The public server category is \`${serverDocument.config.public_data.server_listing.category}\`
**»** ${serverDocument.config.public_data.server_listing.isEnabled ? `Click [here](${serverDocument.config.public_data.server_listing.invite_link}) to join this server` : "There isn't a public invite to this place.."}
		`;
		return string;
	};
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
			description: `${template()}`,
		},
	});
};
