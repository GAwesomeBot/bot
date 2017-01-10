module.exports = (bot, db, config, winston, userDocument, msg) => {
	msg.channel.createMessage(`${config.oauth_link} 😊`);
};
