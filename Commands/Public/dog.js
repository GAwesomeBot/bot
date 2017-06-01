const random = require("random-animal");

/* eslint-disable indent */
module.exports = async (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
  msg.channel.createMessage({
    embed: {
      color: 0x00FF00,
      image: {
        url: await random.dog(),
      },
    },
  });
};
