const util = require("util");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix) => {
	if(suffix) {
		try {
			let result = eval(suffix);
			if(typeof(result)=="object") {
				result = util.inspect(result);
			}
			msg.channel.createMessage(`\`\`\`${result}\`\`\``);
		} catch(err) {
			msg.channel.createMessage(`\`\`\`${err}\`\`\``);
		}
	}
};
