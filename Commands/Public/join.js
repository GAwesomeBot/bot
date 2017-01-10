module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg) => {
	msg.channel.createMessage(`${config.oauth_link} 😊`);
};