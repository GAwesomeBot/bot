module.exports = async ({ Constants: { Text } }, documents, msg, commandData) => {
	return msg.send(Text.INVITE(msg.client));
};
