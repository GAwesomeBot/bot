module.exports = async ({ Constants: { Text } }, documents, msg, commandData) => msg.send(Text.INVITE(msg.client));
