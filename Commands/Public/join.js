/* eslint-disable indent */
module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
  msg.channel.createMessage({
    embed: {
      color: 0x00FF00,
      title: `Thanks for choosing ${bot.user.tag}`,
      description: `Click [here](${config.oauth_link}) to invite me to your server!`,
      footer: {
        text: `Use "${bot.getCommandPrefix(msg.channel.guild, serverDocument)}help" to see what commands you can use in here.`,
      },
    },
  });
};
