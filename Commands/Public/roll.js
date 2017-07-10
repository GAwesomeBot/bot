// Get a random integer in specified range, inclusive
const getRandomInt = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let min, max;
	if(suffix.indexOf(" ")>-1) {
		min = suffix.substring(0, suffix.indexOf(" "));
		max = suffix.substring(suffix.indexOf(" ")+1);
	} else if(!suffix) {
		min = 1;
		max = 6;
	} else {
		min = 0;
		max = suffix;
	}
	const roll = getRandomInt(parseInt(min), parseInt(max));
	if(isNaN(roll)) {
		winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage("wut.");
	} else {
		msg.channel.createMessage(`${msg.author.mention} rolled a **${roll}** 🎲`);
	}
};
