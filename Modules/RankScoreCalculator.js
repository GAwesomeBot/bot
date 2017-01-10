// Computes rank score from weekly message count and voice time
module.exports = (messages, voice) => {
	return messages + voice;
};