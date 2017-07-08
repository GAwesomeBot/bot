/* eslint-disable indent, max-len */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
  let embed = {
    embed: {
      color: 0x00FF00,
      title: `**${msg.author.username}** sent an alert in #${msg.channel.name} on ${msg.channel.guild.name}${(suffix !== "" ? ":" : "")}`,
      description: suffix !== "" ? `\`\`\`${suffix}\`\`\`` : "",
    },
  };
	bot.messageBotAdmins(msg.channel.guild, serverDocument, embed);
	msg.channel.createMessage({
    embed: {
      color: 0x00FF00,
      description: "The admins have been alerted! ⚠",
    },
  });
};
