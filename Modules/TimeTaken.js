/* eslint-disable indent */
/* eslint-disable arrow-body-style */
/*
 * An easy way to get the duration between messages
 * @param newMessage The new message
 * @param oldMessage The old message
 */
module.exports = (newMessage, oldMessage) => {
  return Math.floor((newMessage.timestamp - oldMessage.timestamp) / 10);
};
